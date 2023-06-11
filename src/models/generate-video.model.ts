import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateVideoData {
  @ApiProperty({
    type: Number,
    description: 'Width of the output video',
  })
  output_video_width: number;

  @ApiProperty({
    type: Number,
    description: 'Height of the output video',
  })
  output_video_height: number;

  @ApiProperty({
    type: Number,
    description: 'Duration of the output video in seconds',
  })
  output_video_duration_in_seconds: number;

  @ApiProperty({
    type: Number,
    description: 'Frame rate of the output video',
  })
  output_video_frame_rate: number;

  @ApiProperty({
    type: String,
    description: 'Path to the output video file',
  })
  output_video_file: string;

  @ApiProperty({
    type: String,
    description: 'Path to the background image file',
  })
  backgroun_image_path: string;

  @ApiProperty({
    enum: ['shrink', 'stretch'],
    description: 'Option for resizing the background image',
  })
  backgroun_image_resize_option: 'shrink' | 'stretch';

  @ApiProperty({
    type: String,
    description: 'Path to the background audio file',
  })
  backgroun_audio_path: string;

  @ApiProperty({
    type: Number,
    description: 'Volume of the background audio (0 to 1)',
  })
  backgroun_audio_volume: number;

  @ApiProperty({
    type: () => [SlideData],
    description: 'Array of slide data',
  })
  slides: SlideData[];
}

export class SlideData {
  @ApiProperty({
    type: String,
    description: 'Path to the audio file for the slide',
  })
  audio_text_path: string;

  @ApiProperty({
    type: () => [TextStringData],
    description: 'Array of text strings for the slide',
  })
  text_strings: TextStringData[];

  @ApiProperty({
    type: Number,
    description: 'X position of the text block on the slide',
  })
  text_block_x_position: number;

  @ApiProperty({
    type: Number,
    description: 'Y position of the text block on the slide',
  })
  text_block_y_position: number;
}

export class TextStringData {
  @ApiProperty({
    type: String,
    description: 'Text string to be displayed',
  })
  text_string: string;

  @ApiProperty({
    type: String,
    description: 'Color of the text (in hex format)',
  })
  text_color: string;

  @ApiProperty({
    type: String,
    description: 'Font of the text',
  })
  text_font: string;

  @ApiProperty({
    type: Number,
    description: 'Font size of the text',
  })
  text_fontSize: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the text is bold (optional)',
  })
  text_is_bold?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the text is italic (optional)',
  })
  text_is_italic?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the text is underline (optional)',
  })
  text_is_underline?: boolean;
}
