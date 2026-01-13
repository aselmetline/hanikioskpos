import { categories } from '@/data/sampleData';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelectCategory(null)}
        className={`shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
          selectedCategory === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        }`}
      >
        الكل
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <span>{category.icon}</span>
          <span>{category.nameAr}</span>
        </button>
      ))}
    </div>
  );
}
