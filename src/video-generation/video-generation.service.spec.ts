import { Test, TestingModule } from '@nestjs/testing';
import { VideoGenerationService } from './video-generation.service';

describe('VideoGenerationService', () => {
  let service: VideoGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoGenerationService],
    }).compile();

    service = module.get<VideoGenerationService>(VideoGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
