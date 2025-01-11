import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let _prismaService: PrismaService;
  let _jwtService: JwtService;
  let _configService: ConfigService;

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    role: Role.ADMIN,
    refreshTokens: [],
    usedTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, password);
      const { password: _, ...expectedUser } = mockUser;

      expect(result).toEqual(expectedUser);
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        'wrong@email.com',
        'password123',
      );
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data when login is successful', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockAccessToken = 'mock-access-token';

      jest.spyOn(service, 'validateUser').mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        refreshTokens: [],
        usedTokens: [],
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      mockJwtService.signAsync.mockResolvedValue(mockAccessToken);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = { email: 'wrong@email.com', password: 'wrongpassword' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token management', () => {
    it('should mark token as used', async () => {
      const userId = 'user-id';
      const tokenId = 'token-id';

      mockPrismaService.user.update.mockResolvedValue({ ...mockUser });

      await service.markTokenAsUsed(userId, tokenId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          usedTokens: {
            push: tokenId,
          },
        },
      });
    });

    it('should check if token is used', async () => {
      const userId = 'user-id';
      const tokenId = 'token-id';
      const usedTokenId = 'used-token-id';

      mockPrismaService.user.findUnique.mockResolvedValue({
        usedTokens: [usedTokenId],
      });

      const isUsedToken = await service.isTokenUsed(userId, usedTokenId);
      const isUnusedToken = await service.isTokenUsed(userId, tokenId);

      expect(isUsedToken).toBe(true);
      expect(isUnusedToken).toBe(false);
    });
  });

  describe('refreshTokens', () => {
    it('should return new access token when refresh token is valid', async () => {
      const refreshTokenDto = { refresh_token: 'valid-refresh-token' };
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      const mockNewAccessToken = 'new-access-token';

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokens: [refreshTokenDto.refresh_token],
      });
      mockJwtService.signAsync.mockResolvedValue(mockNewAccessToken);

      const result = await service.refreshTokens(refreshTokenDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshTokenDto = { refresh_token: 'invalid-refresh-token' };
      mockJwtService.verifyAsync.mockRejectedValue(new Error());

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is not found in user records', async () => {
      const refreshTokenDto = { refresh_token: 'valid-refresh-token' };
      const mockPayload = { sub: mockUser.id, email: mockUser.email };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokens: ['different-refresh-token'],
      });

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
