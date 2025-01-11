import {
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ example: 'E-commerce Platform' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'A full-stack e-commerce platform built with React and Node.js',
  })
  @IsString()
  description: string;

  @ApiProperty({ example: ['React', 'Node.js', 'MongoDB'] })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl()
  liveUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/username/project' })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  featured: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  importance: number;

  @ApiPropertyOptional({
    example: 'FULL_STACK',
    enum: Category,
    default: Category.DEFAULT,
    description: 'Project category (defaults to DEFAULT if not specified)',
  })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}
