import AdminPage from '../page';

const sections = {
  pages: 'Pages',
  projects: 'Projects',
  services: 'Services',
  inquiries: 'Inquiries',
  marketing: 'Marketing',
  'social-links': 'Social links',
};

export default async function AdminSectionRoute({ params }) {
  const { section } = await params;
  return <AdminPage key={section} initialSection={sections[section] || 'Overview'} />;
}
