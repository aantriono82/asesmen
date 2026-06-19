# Known Issues

## Dependency Vulnerability yang Membutuhkan Major Upgrade

Masih ada dependency vulnerability yang tidak ditutup pada siklus ini karena perbaikannya membutuhkan major version upgrade dan berpotensi mengubah perilaku runtime atau API internal.

Status saat ini:

- diketahui
- belum diblokir sebagai issue fungsional untuk development/testing harian
- ditunda sampai ada window upgrade khusus beserta regresi test yang memadai

Catatan:

- issue ini tidak mengubah status readiness `v1.0` untuk development/testing penuh
- sebelum production hardening lanjutan, dependency audit dan upgrade mayor tetap perlu dijadwalkan
