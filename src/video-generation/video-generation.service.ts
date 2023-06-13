import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import { createCanvas, registerFont, Image } from 'canvas';
import { Readable } from 'stream';
import { promisify } from 'util';
import {
  GenerateVideoData,
  SlideData,
  TextStringData,
} from '../models/generate-video.model';
import axios from 'axios';
const { exec } = require('child_process');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
let tempSlidesVideos = [];

@Injectable()
export class VideoGenerationService {
  async generateVideo(data: GenerateVideoData): Promise<string> {
    const {
      output_video_width,
      output_video_height,
      output_video_duration_in_seconds,
      output_video_frame_rate,
      output_video_file_name,
      backgroun_image_path,
      backgroun_image_resize_option,
      backgroun_audio_path,
      backgroun_audio_volume,
      slides,
    } = data;

    // Load background image
    const backgroundImage = await this.loadImage(backgroun_image_path);
    console.log('VideoGenerationService | generateVideo | backgroundImage.');

    // Configure FFmpeg
    const ffmpegPaths: any[] = [];
    const outputPaths: string[] = [];
    tempSlidesVideos = [];
    // Generate video frames for each slide
    let videoDuration = 0;
    let slideNumber = 0;

    let promises = [];
    let filePathList = [];

    for (const slide of slides) {
      const {
        audio_text_path,
        text_strings,
        text_block_x_position,
        text_block_y_position,
      } = slide;

      // Load text audio
      const textAudio = await this.loadAudio(audio_text_path);
      console.log('VideoGenerationService | generateVideo | textAudio.');

      // Setup canvas for the slide
      const canvas = createCanvas(output_video_width, output_video_height);
      canvas.width = output_video_width * 2; // Set width to desired resolution
      canvas.height = output_video_height * 2; // Set height to desired resolution
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2); // Scale the context to match the new resolution

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(backgroundImage, 0, 0);

      let text_block_x_position_tmp = text_block_x_position;

      for (const textString of text_strings) {
        const {
          text_string,
          text_color,
          text_font,
          text_fontSize,
          text_is_bold,
          text_is_italic,
          text_is_underline,
        } = textString;

        // Set text style

        ctx.fillStyle = text_color;
        ctx.font = `${text_is_bold ? 'bold ' : ''}${
          text_is_italic ? 'italic ' : ''
        }${text_fontSize}px ${text_font}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Measure the text width
        const textWidth = ctx.measureText(text_string).width;

        ctx.fillText(
          text_string,
          text_block_x_position_tmp,
          text_block_y_position,
        );
        // Update the x position for the next text
        text_block_x_position_tmp += textWidth;
      }

      // Create a readable stream from the canvas image data
      ctx.patternQuality = 'best';
      ctx.antialias = 'subpixel';
      const streamImage = canvas.toBuffer('image/png');

      const imagePath = path.join(
        __dirname,
        '..',
        'output-raw',
        'p1',
        `temp_image_${slideNumber}.png`,
      );
      const audioPath = path.join(
        __dirname,
        '..',
        'output-raw',
        'p1',
        `temp_audio_${slideNumber}.mp3`,
      );
      promises.push(this.writeImageStream(imagePath, streamImage));
      promises.push(this.writeAudioStream(audioPath, textAudio));

      filePathList.push({
        image: imagePath,
        audio: audioPath,
      });

      slideNumber++;
    }

    try {
      await Promise.all(promises);
      console.log('All slides processed!');

      const filePathListOutputPath = path.join(
        __dirname,
        '..',
        'output-raw',
        `p1_filePath.txt`,
      );
      await this.writeFile(filePathList, filePathListOutputPath);

      console.log('writeFile processed!');

      const videoOutputPath = path.join(
        __dirname,
        '..',
        '..',
        'assets',
        output_video_file_name,
      );
      await this.createVideoFromPhotosAndAudio(
        tempSlidesVideos,
        videoOutputPath,
      );

      console.log('Video creation end!');
      return 'http://localhost:3000/assets/' + output_video_file_name;
    } catch (error) {
      console.log('Video creation error!');
      return 'error';
    }
  }

  private async writeFile(filePathList, outputFilePath) {
    let counter = -1;
    const fileContent = await Promise.all(
      filePathList.map(async ({ image, audio }) => {
        const duration = await this.calculateAudioDuration(audio);

        await new Promise((resolve, reject) => {
          counter++;
          const videoOutputPath = path.join(
            __dirname,
            '..',
            'output-raw',
            'p1',
            `p1_finalVideo_${counter}.mp4`,
          );
          tempSlidesVideos.push(videoOutputPath);
          ffmpeg()
            .input(image)
            .inputOptions('-loop 1')
            .input(audio)
            .outputOptions('-t', duration)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-pix_fmt', 'yuv420p')
            .output(videoOutputPath)
            .on('end', () => {
              console.log('Video successfully created!');
              resolve('Video successfully created!');
            })
            .on('error', (err) => {
              console.error('Error creating video:', err);
              reject(err);
            })
            .run();
        });

        return `file '${image}'\nfile '${audio}'`;
      }),
    );

    await fs.promises.writeFile(outputFilePath, fileContent.join('\n'));
  }

  private calculateAudioDuration(audioFilePath): Promise<number> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg().input(audioFilePath);
      command.ffprobe((err, data) => {
        if (err) {
          console.error('Error calculating audio duration:', err);
          reject(err);
        } else {
          const duration = data.format.duration;
          command.kill();
          resolve(duration);
        }
      });
    });
  }

  private async createVideoFromPhotosAndAudio(
    filePathList,
    outputFilePath,
  ): Promise<any> {
    let tempFolder = path.join(__dirname, '..', 'output-raw-tmp');
    const directory = path.dirname(tempFolder);
    await mkdir(directory, { recursive: true });

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      for (let i = 0; i < filePathList.length; i++) {
        command.input(filePathList[i]);
      }
      command
        .outputOptions('-pix_fmt', 'yuv420p')
        .videoCodec('libx264')
        .on('end', () => {
          console.log('Final video successfully created!');
          resolve('Final Video successfully created!');
        })
        .on('error', (err) => {
          console.error('Error creating final video:', err);
          reject(err);
        });
      // .on('stderr', (stderrLine) => {
      //   console.error('FFmpeg stderr:', stderrLine);
      // });

      command.mergeToFile(outputFilePath, tempFolder);
    });
  }

  private async writeImageStream(filePath, streamImage): Promise<any> {
    try {
      const directory = path.dirname(filePath);
      await mkdir(directory, { recursive: true });
      await writeFile(filePath, streamImage);
    } catch (err) {
      throw new Error('Error writing image stream: ' + err.message);
    }
  }

  private async writeAudioStream(filePath, textAudio): Promise<any> {
    try {
      const directory = path.dirname(filePath);
      await mkdir(directory, { recursive: true });

      const audioFile = fs.createWriteStream(filePath);
      return new Promise((resolve, reject) => {
        textAudio.stream
          .pipe(audioFile)
          .on('finish', resolve)
          .on('error', reject);
      });
    } catch (err) {
      throw new Error('Error writing audio stream: ' + err.message);
    }
  }

  private async loadImage(imagePath: string): Promise<any> {
    console.log('VideoGenerationService | loadImage | start.');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => {
        console.log('VideoGenerationService | loadImage | end.');
        resolve(img);
      };
      img.onerror = (e) => {
        console.log('VideoGenerationService | loadImage | reject.');
        reject(e);
      };
    });
  }

  private isURL(imagePath: string): boolean {
    try {
      new URL(imagePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async loadAudio(
    audioPath: string,
  ): Promise<{ stream: Readable; duration: number }> {
    return new Promise<{ stream: Readable; duration: number }>(
      (resolve, reject) => {
        if (this.isURL(audioPath)) {
          axios
            .get(audioPath, { responseType: 'stream' })
            .then((response) => {
              const stream = response.data;
              const duration = 0; // Replace this with your logic to determine the audio duration
              resolve({ stream, duration });
            })
            .catch((error) => {
              reject(error);
            });
        } else {
          ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) {
              reject(err);
              return;
            }
            const duration = metadata.format.duration;
            const stream = fs.createReadStream(audioPath);
            resolve({ stream, duration });
          });
        }
      },
    );
  }
}
