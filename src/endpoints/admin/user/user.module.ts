import { Module } from '@nestjs/common';
import { MailModule } from '@app/services/mail/mail.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [MailModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
