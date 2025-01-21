import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Send a contact form message' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  @ApiResponse({ status: 500, description: 'Failed to send email' })
  async sendContactMessage(@Body() contactDto: ContactDto) {
    await this.contactService.sendContactEmail(contactDto);
    return { message: 'Email sent successfully' };
  }
}
