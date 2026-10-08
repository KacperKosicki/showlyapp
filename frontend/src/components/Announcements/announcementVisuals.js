import { FiMusic, FiCamera, FiScissors, FiFeather, FiCode, FiPenTool, FiBookOpen, FiTool, FiZap } from 'react-icons/fi';

const visuals = {
  music: [FiMusic, '#e4ddff'], photo: [FiCamera, '#dce9ff'], beauty: [FiScissors, '#ffe0ee'],
  flowers: [FiFeather, '#ffe3c9'], development: [FiCode, '#d8ff72'], design: [FiPenTool, '#f7e5b2'],
  education: [FiBookOpen, '#d8efe2'], local: [FiTool, '#e1e6ed'], other: [FiZap, '#e4ddff'],
};
export const categoryVisual = category => {
  const [Icon, color] = visuals[category] || visuals.other;
  return { Icon, color };
};
export const profileImage = image => {
  const url = typeof image === 'string' ? image : image?.url;
  if (!url) return '';
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${process.env.REACT_APP_API_URL || ''}${url}`;
  if (url.startsWith('uploads/')) return `${process.env.REACT_APP_API_URL || ''}/${url}`;
  if (url.startsWith('/')) return url;
  return '';
};
