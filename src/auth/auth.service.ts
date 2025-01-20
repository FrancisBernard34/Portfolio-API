import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async validateToken(token: string) {
    try {
      const validatedToken = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return validatedToken;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException(
        'An error occurred while validating the token',
      );
    }
  }

  private async generateAccessToken(userId: string, email: string) {
    const tokenId = uuidv4();
    const token = await this.jwtService.signAsync(
      { sub: userId, email, tokenId },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      },
    );
    return { token, tokenId };
  }

  private async generateRefreshToken(userId: string, email: string) {
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, tokenId: uuidv4() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: {
          push: refreshToken,
        },
      },
    });

    return refreshToken;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { token: accessToken } = await this.generateAccessToken(
      user.id,
      user.email,
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async generateNewRefreshToken(userId: string, email: string) {
    return this.generateRefreshToken(userId, email);
  }

  async markTokenAsUsed(userId: string, tokenId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        usedTokens: {
          push: tokenId,
        },
      },
    });
  }

  async isTokenUsed(userId: string, tokenId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usedTokens: true },
    });
    return user?.usedTokens.includes(tokenId) ?? false;
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refresh_token,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      );

      // Find user and check if refresh token exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (
        !user ||
        !user.refreshTokens.includes(refreshTokenDto.refresh_token)
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Remove the used refresh token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokens: {
            set: user.refreshTokens.filter(
              (token) => token !== refreshTokenDto.refresh_token,
            ),
          },
        },
      });

      // Generate new access token
      const { token: accessToken } = await this.generateAccessToken(
        user.id,
        user.email,
      );

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async invalidateTokens(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: { set: [] },
        usedTokens: { set: [] },
      },
    });
  }
}
