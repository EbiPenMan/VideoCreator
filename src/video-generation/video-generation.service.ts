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
                text_block_line_hight,
                textAlign,
                textBaseline,
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
            let text_block_y_position_tmp = text_block_y_position;
            let textAlign_tmp = textAlign;

            // for (let index = 0; index < text_strings.length; index++) {
            //   const element = text_strings[index];

            // }

            for (let index = 0; index < text_strings.length; index++) {
                const {
                    text_string,
                    text_color,
                    text_font,
                    text_fontSize,
                    text_is_bold,
                    text_is_italic,
                    text_is_underline,
                } = text_strings[index];

                // Set text style

                if (textAlign === 'center') {
                    let text_block_x_position_tmp1 =
                        text_block_x_position -
                        this.measureTextLine(
                            ctx,
                            text_strings,
                            textBaseline,
                            textAlign,
                            index
                        ) *
                        0.5;
                    // text_block_x_position_tmp1 -= Math.abs((text_block_x_position_tmp - text_block_x_position_tmp1));
                    text_block_x_position_tmp = text_block_x_position_tmp1;

                    textAlign_tmp = 'left';
                }

                if (textAlign === 'right') {
                    let text_block_x_position_tmp1 =
                        text_block_x_position -
                        this.measureTextLine(
                            ctx,
                            text_strings,
                            textBaseline,
                            textAlign,
                            index
                        );
                    // text_block_x_position_tmp1 -= Math.abs((text_block_x_position_tmp - text_block_x_position_tmp1));
                    text_block_x_position_tmp = text_block_x_position_tmp1;

                    textAlign_tmp = 'left';
                }

                ctx.fillStyle = text_color;
                ctx.font = `${text_is_bold ? 'bold ' : ''}${text_is_italic ? 'italic ' : ''
                    }${text_fontSize}px ${text_font}`;
                ctx.textBaseline = textBaseline;
                ctx.textAlign = textAlign_tmp;

                // Measure the text width
                const textWidth = ctx.measureText(text_string).width;

                // let textLines = this.sliptLinesText(ctx, text_string);
                //TODO check
                // text_block_y_position_tmp = text_block_y_position;
                // for (const line of textLines) {
                //   ctx.fillText(
                //     line,
                //     text_block_x_position_tmp,
                //     text_block_y_position_tmp,
                //   );
                //   if (textLines.length > 1) {
                //     text_block_y_position_tmp += text_block_line_hight;
                //     text_block_x_position_tmp = text_block_x_position;
                //   }
                // }

                ctx.fillText(
                    text_string,
                    text_block_x_position_tmp,
                    text_block_y_position_tmp,
                );

                // Update the x position for the next text
                if (textAlign === 'left' || textAlign === 'start') {
                  text_block_x_position_tmp += textWidth;
                }
                // else if (textAlign === 'right' || textAlign === 'end') {
                //   text_block_x_position_tmp -= textWidth;
                // }
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

    // @description: wrapText wraps HTML canvas text onto a canvas of fixed width
    // @param ctx - the context for the canvas we want to wrap text on
    // @param text - the text we want to wrap.
    // @param x - the X starting point of the text on the canvas.
    // @param y - the Y starting point of the text on the canvas.
    // @param maxWidth - the width at which we want line breaks to begin - i.e. the maximum width of the canvas.
    // @param lineHeight - the height of each line, so we can space them below each other.
    // @returns an array of [ lineText, x, y ] for all lines
    private wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        // First, start by splitting all of our text into words, but splitting it into an array split by spaces
        let words = text.split(' ');
        let line = ''; // This will store the text of the current line
        let testLine = ''; // This will store the text when we add a word, to test if it's too long
        let lineArray = []; // This is an array of lines, which the function will return

        // Lets iterate over each word
        for (var n = 0; n < words.length; n++) {
            // Create a test line, and measure it..
            testLine += `${words[n]} `;
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            // If the width of this test line is more than the max width
            if (testWidth > maxWidth && n > 0) {
                // Then the line is finished, push the current line into "lineArray"
                lineArray.push([line, x, y]);
                // Increase the line height, so a new line is started
                y += lineHeight;
                // Update line and test line to use this word as the first word on the next line
                line = `${words[n]} `;
                testLine = `${words[n]} `;
            } else {
                // If the test line is still less than the max width, then add the word to the current line
                line += `${words[n]} `;
            }
            // If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
            if (n === words.length - 1) {
                lineArray.push([line, x, y]);
            }
        }
        // Return the line array
        return lineArray;
    }

    // @description: wrapText wraps HTML canvas text onto a canvas of fixed width
    // @param ctx - the context for the canvas we want to wrap text on
    // @param text - the text we want to wrap.
    private sliptLinesText(ctx, text) {
        let words = text.split('\n');
        for (let index = 0; index < words.length; index++) {
            const element = words[index];
            words[index] = words[index].replace(/[\r\n]/gm, '');
        }
        return words;
    }

    private measureTextLine(
        ctx,
        text_strings,
        textBaseline,
        textAlign,
        currentIndex,
    ) {
        let lineWidth = 0;
        for (let i = currentIndex; i < text_strings.length; i++) {
            const {
                text_string,
                text_color,
                text_font,
                text_fontSize,
                text_is_bold,
                text_is_italic,
                text_is_underline,
            } = text_strings[i];

            // Set text style

            ctx.fillStyle = text_color;
            ctx.font = `${text_is_bold ? 'bold ' : ''}${text_is_italic ? 'italic ' : ''
                }${text_fontSize}px ${text_font}`;
            ctx.textBaseline = textBaseline;
            ctx.textAlign = textAlign;

            // Measure the text width
            lineWidth += ctx.measureText(text_string).width;
        }

        let lineWidthBefor = 0;

        if (textAlign === 'center') {
            for (let i = 0; i < currentIndex; i++) {
                const {
                    text_string,
                    text_color,
                    text_font,
                    text_fontSize,
                    text_is_bold,
                    text_is_italic,
                    text_is_underline,
                } = text_strings[i];

                // Set text style

                ctx.fillStyle = text_color;
                ctx.font = `${text_is_bold ? 'bold ' : ''}${text_is_italic ? 'italic ' : ''
                    }${text_fontSize}px ${text_font}`;
                ctx.textBaseline = textBaseline;
                ctx.textAlign = textAlign;

                // Measure the text width
                lineWidthBefor += ctx.measureText(text_string).width;
            }
        }

        return lineWidth - lineWidthBefor;
    }
}
