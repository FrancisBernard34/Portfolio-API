import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../common/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let _prismaService: PrismaService;

  const mockProject = {
    id: 'project-1',
    title: 'Test Project',
    description: 'Test Description',
    technologies: ['Node.js', 'React'],
    imageUrl: 'https://test.com/image.jpg',
    liveUrl: 'https://test.com',
    githubUrl: 'https://github.com/test',
    featured: true,
    importance: 1,
    category: Category.FULL_STACK,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createProjectDto = {
        title: 'New Project',
        description: 'New Description',
        technologies: ['Node.js'],
        imageUrl: 'https://test.com/image.jpg',
        featured: false,
        importance: 1,
      };

      mockPrismaService.project.create.mockResolvedValue({
        ...mockProject,
        ...createProjectDto,
      });

      const result = await service.create(createProjectDto);

      expect(result).toEqual({
        ...mockProject,
        ...createProjectDto,
      });
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: createProjectDto,
      });
    });
  });

  describe('findAll', () => {
    it('should return all projects without filters', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll({});

      expect(result).toEqual([mockProject]);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { importance: 'desc' },
      });
    });

    it('should apply category filter', async () => {
      const category = Category.FULL_STACK;
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll({ category });

      expect(result).toEqual([mockProject]);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { category },
        orderBy: { importance: 'desc' },
      });
    });

    it('should apply featured filter', async () => {
      const featured = true;
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll({ featured });

      expect(result).toEqual([mockProject]);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { featured },
        orderBy: { importance: 'desc' },
      });
    });

    it('should apply custom sorting', async () => {
      const sort = 'createdAt';
      const order = 'asc';
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll({ sort, order });

      expect(result).toEqual([mockProject]);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { [sort]: order },
      });
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne(mockProject.id);

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
    });

    it('should throw NotFoundException when project is not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateProjectDto = {
        title: 'Updated Title',
      };

      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        ...updateProjectDto,
      });

      const result = await service.update(mockProject.id, updateProjectDto);

      expect(result).toEqual({
        ...mockProject,
        ...updateProjectDto,
      });
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: updateProjectDto,
      });
    });

    it('should throw NotFoundException when project to update is not found', async () => {
      mockPrismaService.project.update.mockRejectedValue(new Error());

      await expect(
        service.update('non-existent-id', { title: 'Updated Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockPrismaService.project.delete.mockResolvedValue(mockProject);

      const result = await service.remove(mockProject.id);

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
    });

    it('should throw NotFoundException when project to delete is not found', async () => {
      mockPrismaService.project.delete.mockRejectedValue(new Error());

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
