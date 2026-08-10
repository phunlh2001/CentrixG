import { ApiProperty } from '@nestjs/swagger';

/**
 * Representation of the third-party file URL response.
 */
export class ThirdPartyFileUrlModel {
  @ApiProperty({
    example: 'https://example.com/third-party/ubisoft-installer.exe',
    description: 'URL of the third-party installer or file',
  })
  fileUrl: string;
}
