import { Module } from '@nestjs/common';
import { TokenService } from './token.service';

/**
 * Owns refresh-token persistence. Exported for the Auth module.
 */
@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
