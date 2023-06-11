import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import { createCanvas, registerFont, Image } from 'canvas';
import { Readable } from 'stream';
import { promisify } from 'util';
import { GenerateVideoData, SlideData, TextStringData } from '../models/generate-video.model';
import axios from 'axios';
const { exec } = require('child_process');

@Injectable()
export class VideoGenerationService {
    // async generateVideo(data: GenerateVideoData): Promise<string> {
    //     const {
    //         output_video_width,
    //         output_video_height,
    //         output_video_duration_in_seconds,
    //         output_video_frame_rate,
    //         output_video_file,
    //         backgroun_image_path,
    //         backgroun_image_resize_option,
    //         backgroun_audio_path,
    //         backgroun_audio_volume,
    //         slides,
    //     } = data;

    //     // Load background image
    //     const backgroundImage = await this.loadImage(backgroun_image_path);
    //     console.log("VideoGenerationService | generateVideo | backgroundImage.");

    //     // Setup canvas
    //     const canvas = createCanvas(output_video_width, output_video_height);
    //     const ctx = canvas.getContext('2d');

    //     // Configure FFmpeg
    //     const ffmpegPath = ffmpeg();
    //     ffmpegPath.outputOptions([
    //         '-r ' + output_video_frame_rate,
    //         '-pix_fmt yuv420p',
    //         '-movflags +faststart',
    //     ]);

    //     // Generate video frames
    //     let videoDuration = 0;
    //     for (const slide of slides) {
    //         const { audio_text_path, text_strings, text_block_x_position, text_block_y_position } = slide;

    //         // Load text audio
    //         const textAudio = await this.loadAudio(audio_text_path);
    //         console.log("VideoGenerationService | generateVideo | textAudio.");

    //         for (const textString of text_strings) {
    //             const {
    //                 text_string,
    //                 text_color,
    //                 text_font,
    //                 text_fontSize,
    //                 text_is_bold,
    //                 text_is_italic,
    //                 text_is_underline,
    //             } = textString;

    //             // Set text style
    //             ctx.clearRect(0, 0, canvas.width, canvas.height);
    //             ctx.drawImage(backgroundImage, 0, 0);

    //             ctx.fillStyle = text_color;
    //             ctx.font = `${text_is_bold ? 'bold ' : ''}${text_is_italic ? 'italic ' : ''}${text_fontSize}px ${text_font}`;
    //             ctx.textBaseline = 'top';
    //             ctx.textAlign = 'left';
    //             ctx.fillText(text_string, text_block_x_position, text_block_y_position);

    //             // Create a readable stream from the canvas image data
    //             const frameImageData = canvas.toBuffer();
    //             const frameStream = new Readable();
    //             frameStream.push(frameImageData);
    //             frameStream.push(null); // Signal the end of the stream

    //             // Add frame to FFmpeg as a video input
    //             ffmpegPath.input(frameStream).inputOptions('-f rawvideo');

    //             // Add frame overlay to the complex filtergraph
    //             ffmpegPath.complexFilter([`[${ffmpegPath._inputs.length - 1}:v]overlay=format=auto[output]`,], 'output');
    //             console.log("VideoGenerationService | generateVideo | Add frame to FFmpeg.");

    //             ffmpegPath.input(textAudio.stream); // Add textAudio as an audio input for the slide

    //             videoDuration += textAudio.duration;
    //         }
    //     }

    //     const backgroundAudio = await this.loadAudio(backgroun_audio_path);
    //     const backgroundAudioStream = backgroundAudio.stream;
    //     const backgroundAudioDuration = backgroundAudio.duration;


    //     // Add background audio as an audio input
    //     ffmpegPath.input(backgroundAudioStream).inputOptions('-stream_loop -1').audioCodec('aac');

    //     console.log("VideoGenerationService | generateVideo | Generate final video.");
    //     // Generate final video
    //     ffmpegPath
    //         .output(path.join(__dirname, '..', 'output', output_video_file))
    //         .outputOptions([
    //             '-c:v libx264',
    //             '-crf 23',
    //             '-preset veryfast',
    //             '-vf format=yuv420p',
    //             '-c:a aac',
    //             '-b:a 128k',
    //             '-shortest',
    //         ])
    //         .audioCodec('aac')
    //         .audioBitrate('128k')
    //         .audioFilter('volume=' + backgroun_audio_volume) // Set background audio volume
    //         .inputFPS(output_video_frame_rate)
    //         .inputOptions('-stream_loop -1') // Loop background audio
    //         .on('start', (command) => console.log('FFmpeg command:', command))
    //         .on('error', (err) => {
    //             console.error('FFmpeg error:', err);
    //             throw new Error('Video generation failed');
    //         })
    //         .on('end', () => console.log('Video generation completed'))
    //         .run();

    //     console.log("VideoGenerationService | generateVideo | end.");
    //     return output_video_file;
    // }

    // private async loadImage(imagePath: string): Promise<any> {
    //     console.log("VideoGenerationService | loadImage | start.");
    //     return new Promise((resolve, reject) => {
    //         if (this.isURL(imagePath)) {
    //             axios
    //                 .get(imagePath, { responseType: 'arraybuffer' })
    //                 .then((response) => {
    //                     const img = new Image();
    //                     img.src = `data:image/jpeg;base64,${Buffer.from(
    //                         response.data,
    //                         'binary'
    //                     ).toString('base64')}`;
    //                     img.onload = () => {
    //                         console.log("VideoGenerationService | loadImage | end.");
    //                         resolve(img);
    //                     }
    //                     img.onerror = (e) => {
    //                         console.log("VideoGenerationService | loadImage | reject.");
    //                         reject(e);
    //                     }
    //                 })
    //                 .catch((error) => {
    //                     console.log("VideoGenerationService | loadImage | reject2.");
    //                     reject(error);
    //                 });
    //         } else {
    //             fs.readFile(imagePath, (err, data) => {
    //                 if (err) {
    //                     console.log("VideoGenerationService | loadImage | readFile reject.");
    //                     reject(err);
    //                     return;
    //                 }
    //                 const img = new Image();
    //                 img.src = `data:image/jpeg;base64,${data.toString('base64')}`;
    //                 img.onload = () => {
    //                     console.log("VideoGenerationService | loadImage | readFile end.");
    //                     resolve(img);
    //                 }
    //                 img.onerror = (e) => {
    //                     console.log("VideoGenerationService | loadImage | readFile reject.");
    //                     reject(e);
    //                 }
    //             });
    //         }
    //     });
    // }

    async generateVideo(data: GenerateVideoData): Promise<string> {
        const {
            output_video_width,
            output_video_height,
            output_video_duration_in_seconds,
            output_video_frame_rate,
            output_video_file,
            backgroun_image_path,
            backgroun_image_resize_option,
            backgroun_audio_path,
            backgroun_audio_volume,
            slides,
        } = data;

        // Load background image
        const backgroundImage = await this.loadImage(backgroun_image_path);
        console.log("VideoGenerationService | generateVideo | backgroundImage.");

        // Configure FFmpeg
        const ffmpegPaths: any[] = [];
        const outputPaths: string[] = [];

        // Generate video frames for each slide
        let videoDuration = 0;
        let slideNumber = 0;
        for (const slide of slides) {
            const { audio_text_path, text_strings, text_block_x_position, text_block_y_position } = slide;

            // Load text audio
            const textAudio = await this.loadAudio(audio_text_path);
            console.log("VideoGenerationService | generateVideo | textAudio.");

            // Setup canvas for the slide
            const canvas = createCanvas(output_video_width, output_video_height);
            canvas.width = output_video_width * 2;   // Set width to desired resolution
            canvas.height = output_video_height * 2; // Set height to desired resolution
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2); // Scale the context to match the new resolution

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(backgroundImage, 0, 0);


            let text_block_x_position_tmp = text_block_x_position

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
                ctx.font = `${text_is_bold ? 'bold ' : ''}${text_is_italic ? 'italic ' : ''}${text_fontSize}px ${text_font}`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';

                // Measure the text width
                const textWidth = ctx.measureText(text_string).width;

                ctx.fillText(text_string, text_block_x_position_tmp, text_block_y_position);
                // Update the x position for the next text
                text_block_x_position_tmp += textWidth;
            }

            // Create a readable stream from the canvas image data
            ctx.patternQuality = 'best';
            ctx.antialias = "subpixel";
            const streamImage = canvas.toBuffer();
            
            // const frameImageData = canvas.toBuffer();
            // const frameStream = new Readable();
            // frameStream.push(frameImageData);
            // frameStream.push(null); // Signal the end of the stream

            // Create a separate FFmpeg instance for each slide
            const ffmpegPathSlideVideo = ffmpeg();
            const outputPath = path.join(__dirname, '..', 'output-raw', `slide_${slides.indexOf(slide)}.mp4`);

            // ffmpegPathSlideVideo
            //     .input(streamImage)
            //     .input(textAudio.stream)
            //     .inputFPS(output_video_frame_rate)
            //     .output(outputPath)
            //     .outputOptions('-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '192k', '-pix_fmt', 'yuv420p', '-shortest')
            //     .format('mp4')
            //     .on('start', (command) => console.log('FFmpeg merge video command:', command))
            //     .on('error', (err) => {
            //         console.error('FFmpeg merge video error:', err);
            //         throw new Error('Video merge failed');
            //     })
            //     .on('end', () => console.log('Video merge completed'))
            //     .run();

            // Save the PNG buffer to a temporary file
            const tempImagePath = path.join(__dirname, '..', 'output-raw', `temp_image_${slideNumber}.png`);
            const tempAudioPath = path.join(__dirname, '..', 'output-raw', `temp_audio_${slideNumber}.mp3`);
            fs.writeFileSync(tempImagePath, streamImage);
            const audioFile = fs.createWriteStream(tempAudioPath);

            // Pipe the audio stream to the audio file
            textAudio.stream.pipe(audioFile);

            textAudio.stream.on('end', () => {

                // Execute the ffmpeg command to merge the image and audio
                const ffmpegCommand = `ffmpeg -y -loop 1 -i ${tempImagePath} -i ${tempAudioPath} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -shortest ${outputPath}`;

                exec(ffmpegCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error merging image and audio: ${error}`);
                    } else {
                        console.log('Merge complete!');
                        // Remove the temporary image file
                        // fs.unlinkSync(tempImagePath);
                    }
                });
                slideNumber++;

            });


        }

        // // Merge audio streams for all slides into a single audio file
        // const mergedAudioPath = path.join(__dirname, '..', 'output', 'merged_audio.mp3');

        // const mergeAudioPromises = slides.map(async (slide) => {
        //     const { audio_text_path } = slide;
        //     const textAudio = await this.loadAudio(audio_text_path);

        //     const ffmpegMergeAudio = ffmpeg();
        //     ffmpegMergeAudio.input(textAudio.stream)
        //         .outputOptions(`-map 0:a`)
        //         .output(mergedAudioPath)
        //         .audioCodec('copy');


        //     return new Promise<void>((resolve, reject) => {
        //         ffmpegMergeAudio.on('start', (command) => console.log('FFmpeg merge audio command:', command))
        //             .on('error', (err) => {
        //                 console.error('FFmpeg merge audio error:', err);
        //                 reject(err);
        //             })
        //             .on('end', () => {
        //                 console.log('Audio merge completed for slide:', audio_text_path);
        //                 resolve();
        //             })
        //             .run();
        //     });
        // });

        // // Wait for all audio merge processes to complete
        // await Promise.all(mergeAudioPromises);


        // // Generate final video by merging slide videos with the merged audio
        // const ffmpegMergeVideo = ffmpeg();
        // for (const outputPath of outputPaths) {
        //     ffmpegMergeVideo.input(outputPath);
        // }

        // ffmpegMergeVideo
        //     .input(mergedAudioPath)
        //     .output(path.join(__dirname, '..', 'output', output_video_file))
        //     .outputOptions([
        //         '-c:v libx264',
        //         '-crf 23',
        //         '-preset veryfast',
        //         '-vf format=yuv420p',
        //         '-c:a aac',
        //         '-b:a 128k',
        //         '-shortest',
        //     ])
        //     .audioCodec('aac')
        //     .audioBitrate('128k')
        //     .audioFilter('volume=' + backgroun_audio_volume) // Set background audio volume
        //     .inputFPS(output_video_frame_rate)
        //     .duration(output_video_duration_in_seconds)
        //     .inputOptions('-stream_loop -1') // Loop background audio
        //     .on('start', (command) => console.log('FFmpeg merge video command:', command))
        //     .on('error', (err) => {
        //         console.error('FFmpeg merge video error:', err);
        //         throw new Error('Video merge failed');
        //     })
        //     .on('end', () => console.log('Video merge completed'))
        //     .run();

        // console.log("VideoGenerationService | generateVideo | end.");
        return output_video_file;
    }

    private async processSlideImage(slideNumber, streamImage){
        const tempImagePath = path.join(__dirname, '..', 'output-raw', `temp_image_${slideNumber}.png`);
        await fs.promises.writeFile(tempImagePath, streamImage);
      };

      private async processSlideAudio(slideNumber, textAudio){
        const tempAudioPath = path.join(__dirname, '..', 'output-raw', `temp_audio_${slideNumber}.mp3`);
        const audioFile = fs.createWriteStream(tempAudioPath);
        await new Promise((resolve, reject) => {
          textAudio.stream.pipe(audioFile)
            .on('finish', resolve)
            .on('error', reject);
        });
      };


    private async loadImage(imagePath: string): Promise<any> {
        console.log("VideoGenerationService | loadImage | start.");
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imagePath;
            img.onload = () => {
                console.log("VideoGenerationService | loadImage | end.");
                resolve(img);
            }
            img.onerror = (e) => {
                console.log("VideoGenerationService | loadImage | reject.");
                reject(e);
            }
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


    private async loadAudio(audioPath: string): Promise<{ stream: Readable, duration: number }> {
        return new Promise<{ stream: Readable, duration: number }>((resolve, reject) => {
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
        });
    }


}
