import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Pengguna wajib diisi' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kata Sandi wajib diisi' })
  password!: string;

  @IsBoolean({ message: 'Verifikasi wajib dilakukan' })
  captcha!: boolean;
}
