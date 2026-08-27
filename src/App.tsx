import { useState } from 'react';
import Picker from './Picker';
import TagList from './TagList';
import type { TagRow } from './types';

const ALL_TAGS = [
  'React', 'TypeScript', 'JavaScript', 'CSS', 'HTML',
  'Node.js', 'Python', 'Rust', 'Go', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'GraphQL', 'REST',
  'MongoDB', 'PostgreSQL', 'Redis', 'Git', 'Linux',
  'Webpack', 'Vite', 'ESLint', 'Prettier', 'Jest',
  'Tailwind', 'SASS', 'WebSockets', 'OAuth', 'CI/CD',
];

export default function App() {
  const [rows, setRows] = useState<TagRow[]>([]);

  return (
    <div className="app">
      <div className="panel">
        <div className="panel-label">Top Left</div>
      </div>
      <Picker tags={ALL_TAGS} />
      <TagList rows={rows} onRowsChange={setRows} />
      <div className="panel">
        <div className="panel-label">Bottom Right</div>
      </div>
    </div>
  );
}
