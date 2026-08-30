import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailModule } from '../../services/mail/mail.module';

/**
 * Owns user persistence and UserController endpoints. Exports UserService
 * so Auth and Product modules can reuse it.
 */
@Module({
  imports: [MailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
