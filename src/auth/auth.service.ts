import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, tokenId: uuidv4() },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: {
          push: refreshToken,
        },
      },
    });

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
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

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email);

      return {
        ...tokens,
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
    // Remove all refresh tokens for the user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: {
          set: [],
        },
      },
    });
  }
}
