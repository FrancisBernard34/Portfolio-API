import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Category } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: createProjectDto,
    });
  }

  async findAll(query: {
    category?: Category;
    featured?: boolean;
    sort?: 'importance' | 'createdAt';
    order?: 'asc' | 'desc';
  }) {
    const { category, featured, sort = 'importance', order = 'desc' } = query;

    const where = {
      ...(category && { category }),
      ...(featured !== undefined && { featured }),
    };

    return this.prisma.project.findMany({
      where,
      orderBy: { [sort]: order },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    try {
      return await this.prisma.project.update({
        where: { id },
        data: updateProjectDto,
      });
    } catch (_) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.project.delete({
        where: { id },
      });
    } catch (_) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }
}
