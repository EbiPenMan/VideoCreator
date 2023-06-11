import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoController } from './video/video.controller';
import { VideoGenerationService } from './video-generation/video-generation.service';


@Module({
  imports: [],
  controllers: [AppController, VideoController],
  providers: [AppService, VideoGenerationService],
})
export class AppModule {

}
