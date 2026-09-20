import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Book, Search, Clock } from 'lucide-react';

export const StudentLibrary = () => {
  const { toast } = useToast();
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [libraryCard, setLibraryCard] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-books' | 'catalog'>('my-books');

  useEffect(() => {
    fetchMyBooks();
  }, []);

  const fetchMyBooks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/library/my-books');
      setMyBooks(res.data.data?.issued || []);
      setLibraryCard(res.data.data?.card);
    } catch {
      // Student may not have a library card yet
    } finally {
      setLoading(false);
    }
  };

  const searchCatalog = async () => {
    try {
      const res = await apiClient.get(`/library/books?q=${encodeURIComponent(search)}`);
      setCatalog(res.data.books || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to search catalog', variant: 'destructive' });
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-slate-500">
            {libraryCard ? `Card: ${libraryCard.cardNumber}` : 'No library card assigned yet'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="border-b border-slate-200 px-6 mt-4">
          <nav className="-mb-px flex space-x-8">
            {(['my-books', 'catalog'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                  ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-600'}`}>
                {tab === 'my-books' ? 'My Books' : 'Search Catalog'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'my-books' && (
            loading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" /></div>
            ) : myBooks.length === 0 ? (
              <div className="text-center py-12">
                <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No books currently issued</p>
                <p className="text-slate-600 text-sm mt-1">Search the catalog to find books</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBooks.map((issue: any) => (
                  <div key={issue.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Book className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{issue.book?.title}</h4>
                        <p className="text-xs text-slate-500">{issue.book?.author}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue(issue.dueDate) ? 'text-red-400' : 'text-slate-600'}`}>
                        <Clock className="w-3 h-3" />
                        Due: {new Date(issue.dueDate).toLocaleDateString()}
                      </div>
                      {isOverdue(issue.dueDate) && (
                        <span className="text-[10px] text-red-500 font-semibold">OVERDUE</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by title, author, or ISBN..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCatalog()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <button onClick={searchCatalog} className="px-4 py-2.5 bg-[#3b82f6] text-white text-sm font-semibold rounded-lg hover:bg-indigo-500">
                  Search
                </button>
              </div>

              {catalog.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        {['Title', 'Author', 'ISBN', 'Available'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.map((book: any) => (
                        <tr key={book.id} className="border-t border-slate-200 hover:bg-slate-100">
                          <td className="px-5 py-3.5 text-sm font-medium">{book.title}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{book.author}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">{book.isbn}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${book.availableCopies > 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-400'}`}>
                              {book.availableCopies}/{book.totalCopies}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-slate-500 text-sm">Type a search query and press Enter to find books</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
