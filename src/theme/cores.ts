export interface CoresTema {
  readonly background: string;
  readonly surface: string;
  readonly surfaceAlt: string;
  readonly border: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly primaryBg: string;
  readonly onPrimary: string;
  readonly success: string;
  readonly danger: string;
  readonly dangerBg: string;
  readonly dangerBorder: string;
  readonly warningBg: string;
  readonly warningBorder: string;
  readonly warningText: string;
  readonly overlay: string;
}

export const coresClaro: CoresTema = Object.freeze({
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#2563EB',
  primaryBg: '#EFF6FF',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FCA5A5',
  warningBg: '#FFFBEB',
  warningBorder: '#FCD34D',
  warningText: '#92400E',
  overlay: 'rgba(17, 24, 39, 0.4)',
});

export const coresEscuro: CoresTema = Object.freeze({
  background: '#0F1419',
  surface: '#1A2029',
  surfaceAlt: '#232B36',
  border: '#2E3744',
  text: '#E6EAF0',
  textSecondary: '#9AA4B2',
  textMuted: '#8894A4',
  primary: '#60A5FA',
  primaryBg: '#172A45',
  onPrimary: '#0F1419',
  success: '#5FD08A',
  danger: '#F87171',
  dangerBg: '#2D1B1E',
  dangerBorder: '#7F3B42',
  warningBg: '#2A2412',
  warningBorder: '#6B5A1E',
  warningText: '#F5D67A',
  overlay: 'rgba(15, 20, 25, 0.7)',
});
