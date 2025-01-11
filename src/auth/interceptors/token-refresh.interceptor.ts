import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only proceed if we have a user (meaning this is a protected route)
    if (request.user) {
      const { id, email } = request.user;
      
      // Generate new refresh token
      const refreshToken = await this.authService.generateNewRefreshToken(id, email);
      
      // Set refresh token in response header
      response.setHeader('X-Refresh-Token', refreshToken);
    }

    return next.handle().pipe(
      map((data) => {
        return data;
      }),
    );
  }
} 