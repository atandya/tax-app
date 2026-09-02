import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /** NIK (16 digits) or NPWP (15 digits) — the Coretax "ID Pengguna". */
  @IsString()
  @Matches(/^\d{15,16}$/, {
    message: 'ID Pengguna harus berupa NIK (16 digit) atau NPWP (15 digit).',
  })
  username!: string;

  @IsString()
  @MinLength(3, { message: 'Nama Lengkap minimal 3 karakter.' })
  @MaxLength(120)
  fullName!: string;

  @IsEmail({}, { message: 'Alamat Email tidak valid.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npwp?: string;

  @IsString()
  @MinLength(8, { message: 'Kata Sandi minimal 8 karakter.' })
  @MaxLength(72, { message: 'Kata Sandi maksimal 72 karakter.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Kata Sandi harus memuat huruf besar, huruf kecil, dan angka.',
  })
  password!: string;

  @IsBoolean({ message: 'Verifikasi wajib dilakukan' })
  captcha!: boolean;
}
