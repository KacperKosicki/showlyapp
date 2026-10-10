export const MAX_PROJECTS = 6;
export const photoKey = photo => {
  if (photo?.publicId) return photo.publicId;
  const url = typeof photo === 'string' ? photo : photo?.url || '';
  // The API adds a new cache version after each profile save.
  return url.replace(/([?&])v=\d+(?=&|$)/g, '$1').replace(/\?&/g, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
};

// Images are resolved from the profile gallery, never from a project-supplied URL.
export const projectPhoto = (project, photos = []) => project?.photoKey
  ? photos.find(photo => photoKey(photo) === project.photoKey) : undefined;

export const validateProjects = (projects = []) => {
  if (!Array.isArray(projects) || projects.length > MAX_PROJECTS) return 'Możesz dodać maksymalnie 6 realizacji.';
  if (projects.some(project => !project.title?.trim())) return 'Nadaj tytuł każdej realizacji albo usuń pustą kartę.';
  if (projects.some(project => project.title.length > 80 || (project.category || '').length > 40 ||
    (project.description || '').length > 800 || (project.outcome || '').length > 240)) return 'Skróć treść realizacji do limitów podanych przy polach.';
  return '';
};
