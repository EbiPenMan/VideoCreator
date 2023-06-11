import { Controller, Post, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoGenerationService } from '../video-generation/video-generation.service';
import { GenerateVideoData, SlideData, TextStringData } from '../models/generate-video.model';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';


@Controller('video')
@ApiTags('Video')
export class VideoController {

    constructor(private readonly videoGenerationService: VideoGenerationService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate Video' })
    @ApiBody({ type: GenerateVideoData })
    async generateVideo(@Body() data: GenerateVideoData): Promise<string> {
        console.log("VideoController | generateVideo | started.");
        return await this.videoGenerationService.generateVideo(data);
    }

}

