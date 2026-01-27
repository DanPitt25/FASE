export interface Author {
  name: string;
  role: string;
}

export interface Article {
  slug: string;
  title: string;
  standfirst: string;
  content: string;
  category: 'analysis' | 'opinion';
  author: Author;
  publishedAt: string;
}
