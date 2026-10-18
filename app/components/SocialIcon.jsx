import { siFacebook, siGithub, siInstagram, siTiktok, siX, siYoutube } from 'simple-icons';

const icons = {
  linkedin: {
    title: 'LinkedIn',
    hex: '0A66C2',
    path: 'M5.372 24H.396V7.977h4.976V24zM2.884 5.791A2.896 2.896 0 1 1 2.884 0a2.896 2.896 0 0 1 0 5.791zM24 24h-4.965v-7.8c0-1.86-.037-4.255-2.592-4.255-2.596 0-2.994 2.026-2.994 4.12V24H8.484V7.977h4.765v2.188h.067c.663-1.256 2.283-2.58 4.7-2.58C23.04 7.585 24 10.918 24 15.252V24z',
  },
  instagram: siInstagram,
  github: siGithub,
  facebook: siFacebook,
  youtube: siYoutube,
  x: siX,
  tiktok: siTiktok,
};

export const socialIconOptions = [
  ['linkedin', 'LinkedIn'],
  ['instagram', 'Instagram'],
  ['github', 'GitHub'],
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
  ['x', 'X'],
  ['tiktok', 'TikTok'],
  ['email', 'Email'],
];

export default function SocialIcon({ name = 'linkedin', className = '' }) {
  if (name === 'email') {
    return <svg aria-hidden="true" className={`${className} email-social-icon`} viewBox="0 0 24 24" role="img" style={{ color: '#6959ee', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><title>Email</title><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  const icon = icons[name] || icons.linkedin;
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" role="img" style={{ color: `#${icon.hex}` }}>
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
