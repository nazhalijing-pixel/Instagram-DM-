import React, { useState } from 'react';
import {
  Users,
  Search,
  Download,
  Filter,
  MessageCircle,
  MessageSquare,
  Instagram,
  Clock,
  Tag,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Contact } from '../../types';

export const ContactsPage: React.FC = () => {
  const { contacts } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  // Collect unique tags
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.ig_username.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const exportCsv = () => {
    const headers = 'IG Username,First Interaction,Last Interaction,Comments,DMs,Stories,Status\n';
    const rows = contacts
      .map(
        (c) =>
          `@${c.ig_username},${c.first_interaction_at},${c.last_interaction_at},${c.interactions.comments},${c.interactions.dms},${c.interactions.stories},${c.status || 'lead'}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoreply_captured_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-8 space-y-8 bg-[#F7F6FB] min-h-screen">
      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Instagram username (e.g. sarah_creator)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
          />
        </div>

        {/* Tag Filters & Export Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTag === null ? 'bg-[#3B5BFF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedTag === tag ? 'bg-[#3B5BFF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            onClick={exportCsv}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Instagram User</th>
                <th className="p-4">Interactions Breakdown</th>
                <th className="p-4">Tags</th>
                <th className="p-4">First Captured</th>
                <th className="p-4">Last Active</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No contacts matched your search filter.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            contact.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.ig_username}`
                          }
                          alt={contact.ig_username}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">@{contact.ig_username}</div>
                          <div className="text-[10px] text-slate-400 font-medium">ID: {contact.ig_user_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Breakdown */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          <MessageSquare className="w-3 h-3" />
                          <span>{contact.interactions.comments} comments</span>
                        </div>
                        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          <MessageCircle className="w-3 h-3" />
                          <span>{contact.interactions.dms} DMs</span>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          <Instagram className="w-3 h-3" />
                          <span>{contact.interactions.stories} stories</span>
                        </div>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* First Captured */}
                    <td className="p-4 text-slate-600 font-medium text-[11px]">
                      {new Date(contact.first_interaction_at).toLocaleDateString()}
                    </td>

                    {/* Last Active */}
                    <td className="p-4 text-slate-600 font-medium text-[11px]">
                      {new Date(contact.last_interaction_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setActiveContact(contact)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-[#3B5BFF] font-bold text-[11px] px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact History Detail Drawer */}
      {activeContact && (
        <div className="fixed inset-0 bg-slate-900/75 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <h3 className="font-bold text-slate-900 text-base">Contact Profile</h3>
                <button
                  onClick={() => setActiveContact(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <img
                  src={
                    activeContact.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeContact.ig_username}`
                  }
                  alt={activeContact.ig_username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 mx-auto mb-2 shadow-sm"
                />
                <h4 className="font-extrabold text-slate-900 text-lg">@{activeContact.ig_username}</h4>
                <p className="text-xs text-slate-500">Instagram User • Captured via Reel DM</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-6">
                <div className="text-xs font-bold text-slate-800">Engagement Breakdown:</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="font-black text-purple-600">{activeContact.interactions.comments}</div>
                    <div className="text-[10px] text-slate-500">Comments</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="font-black text-blue-600">{activeContact.interactions.dms}</div>
                    <div className="text-[10px] text-slate-500">DMs</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="font-black text-amber-600">{activeContact.interactions.stories}</div>
                    <div className="text-[10px] text-slate-500">Stories</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveContact(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
