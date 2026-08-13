import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Building2, Phone } from 'lucide-react';
import { usePhonebook } from './usePhonebook';
import { useAuth } from '../../shared/auth/AuthContext';

const emptyGroup = { title: '', icon: '', color: '', bgColor: '' };
const emptyContact = { title: '', subtitle: '', phone: '', extension: '' };

// Archive's group.icon values are lucide "data-lucide" names in kebab-case
// (e.g. "building-2", "server"). lucide-react exports the same icons in
// PascalCase, so translate before looking the component up. Falls back to
// Building2 (archive's own default group icon) when a name isn't found.
function resolveGroupIcon(iconName) {
    if (!iconName) return Building2;
    const pascal = iconName
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    return LucideIcons[pascal] || Building2;
}

// `embedded` is set by AdminPhonebookTab, which reuses this component as the
// "ข้อมูลสมุดโทรศัพท์" admin tab. The admin shell already has its own
// "back to home" link in its topbar, so the standalone page's back-btn would
// otherwise be duplicated; embedded mode also swaps the outer wrapper for
// `.admin-section` to match the fade-in/spacing of the other admin tabs
// instead of the full-page `.page` entrance animation.
export default function PhonebookPage({ embedded = false }) {
    const { groups, loading, error, createGroup, deleteGroup, addContact, updateContact, deleteContact } =
        usePhonebook();
    const { role } = useAuth();
    const isAdmin = role === 'admin';
    const navigate = useNavigate();

    const [newGroup, setNewGroup] = useState(emptyGroup);
    const [contactDrafts, setContactDrafts] = useState({});
    const [editingContact, setEditingContact] = useState(null);

    const wrapperClass = embedded ? 'admin-section' : 'page';

    if (loading) {
        return (
            <div className={wrapperClass}>
                <div className="page-loading">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" />
                    <div className="skeleton-line w-60" />
                </div>
            </div>
        );
    }
    if (error) return <div className={`${wrapperClass} error-banner`}>{error}</div>;

    async function handleCreateGroup(e) {
        e.preventDefault();
        if (!newGroup.title.trim()) return;
        await createGroup(newGroup);
        setNewGroup(emptyGroup);
    }

    function getDraft(groupId) {
        return contactDrafts[groupId] || emptyContact;
    }

    function setDraft(groupId, draft) {
        setContactDrafts((prev) => ({ ...prev, [groupId]: draft }));
    }

    async function handleAddContact(e, groupId) {
        e.preventDefault();
        const draft = getDraft(groupId);
        if (!draft.title.trim() || !draft.phone.trim()) return;
        await addContact(groupId, draft);
        setDraft(groupId, emptyContact);
    }

    async function handleUpdateContact(e, groupId, contactId) {
        e.preventDefault();
        await updateContact(groupId, contactId, editingContact.data);
        setEditingContact(null);
    }

    // Regular users get archive's read-only display: a section-title card
    // followed by one icon-headed group + contact list per phonebook group,
    // each contact showing a clickable tel: button. CRUD stays admin-only,
    // reusing the original table-based form UI below.
    return (
        <div className={wrapperClass}>
            {!embedded && (
                <div className="mb-4">
                    <button type="button" className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> กลับหน้าหลัก
                    </button>
                </div>
            )}

            <div className="pb-section-title">
                <h2 style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                    ส่วนงานที่เกี่ยวข้อง
                </h2>
            </div>

            {groups.map((group) => {
                const GroupIcon = resolveGroupIcon(group.icon);
                return (
                    <div key={group._id}>
                        <div className="pb-group-header">
                            <div
                                className="pb-group-icon"
                                style={{ background: group.bgColor, color: group.color }}
                            >
                                <GroupIcon size={20} />
                            </div>
                            <h2 className="pb-group-title" style={{ color: group.color }}>
                                {group.title}
                            </h2>
                            {isAdmin && (
                                <button type="button" className="danger" onClick={() => deleteGroup(group._id)}>
                                    ลบกลุ่ม
                                </button>
                            )}
                        </div>

                        <div className="pb-list-container">
                            {group.contacts.length === 0 && (
                                <div className="pb-list-item">
                                    <p className="pb-item-title" style={{ color: 'var(--text-secondary)' }}>
                                        ไม่มีข้อมูลเบอร์โทรศัพท์
                                    </p>
                                </div>
                            )}

                            {group.contacts.map((contact) => (
                                <div className="pb-list-item" key={contact._id}>
                                    {editingContact?.groupId === group._id &&
                                    editingContact?.contactId === contact._id ? (
                                        <form
                                            className="inline-form"
                                            style={{ width: '100%' }}
                                            onSubmit={(e) => handleUpdateContact(e, group._id, contact._id)}
                                        >
                                            <input
                                                value={editingContact.data.title}
                                                onChange={(e) =>
                                                    setEditingContact((prev) => ({
                                                        ...prev,
                                                        data: { ...prev.data, title: e.target.value },
                                                    }))
                                                }
                                            />
                                            <input
                                                value={editingContact.data.subtitle || ''}
                                                onChange={(e) =>
                                                    setEditingContact((prev) => ({
                                                        ...prev,
                                                        data: { ...prev.data, subtitle: e.target.value },
                                                    }))
                                                }
                                            />
                                            <input
                                                value={editingContact.data.phone}
                                                onChange={(e) =>
                                                    setEditingContact((prev) => ({
                                                        ...prev,
                                                        data: { ...prev.data, phone: e.target.value },
                                                    }))
                                                }
                                            />
                                            <input
                                                value={editingContact.data.extension || ''}
                                                onChange={(e) =>
                                                    setEditingContact((prev) => ({
                                                        ...prev,
                                                        data: { ...prev.data, extension: e.target.value },
                                                    }))
                                                }
                                            />
                                            <button type="submit">บันทึก</button>
                                            <button type="button" onClick={() => setEditingContact(null)}>
                                                ยกเลิก
                                            </button>
                                        </form>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="pb-item-title">{contact.title}</p>
                                                {contact.subtitle && (
                                                    <p className="pb-item-subtitle">{contact.subtitle}</p>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <a
                                                    href={`tel:${contact.phone}`}
                                                    className="pb-phone-btn"
                                                    style={{ background: group.bgColor, color: group.color }}
                                                >
                                                    <Phone size={16} /> {contact.phone}{' '}
                                                    {contact.extension && (
                                                        <span
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 'normal',
                                                                marginLeft: 4,
                                                                opacity: 0.8,
                                                            }}
                                                        >
                                                            {contact.extension}
                                                        </span>
                                                    )}
                                                </a>
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditingContact({
                                                                    groupId: group._id,
                                                                    contactId: contact._id,
                                                                    data: { ...contact },
                                                                })
                                                            }
                                                        >
                                                            แก้ไข
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="danger"
                                                            onClick={() => deleteContact(group._id, contact._id)}
                                                        >
                                                            ลบ
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isAdmin && (
                            <form className="inline-form" onSubmit={(e) => handleAddContact(e, group._id)}>
                                <input
                                    placeholder="ชื่องาน/รายละเอียด"
                                    value={getDraft(group._id).title}
                                    onChange={(e) => setDraft(group._id, { ...getDraft(group._id), title: e.target.value })}
                                />
                                <input
                                    placeholder="รายละเอียดรอง (เว้นว่างได้)"
                                    value={getDraft(group._id).subtitle}
                                    onChange={(e) =>
                                        setDraft(group._id, { ...getDraft(group._id), subtitle: e.target.value })
                                    }
                                />
                                <input
                                    placeholder="เบอร์โทรศัพท์"
                                    value={getDraft(group._id).phone}
                                    onChange={(e) => setDraft(group._id, { ...getDraft(group._id), phone: e.target.value })}
                                />
                                <input
                                    placeholder="เบอร์ต่อ (เว้นว่างได้)"
                                    value={getDraft(group._id).extension}
                                    onChange={(e) =>
                                        setDraft(group._id, { ...getDraft(group._id), extension: e.target.value })
                                    }
                                />
                                <button type="submit">เพิ่มเบอร์โทร</button>
                            </form>
                        )}
                    </div>
                );
            })}

            {isAdmin && (
                <div className="phonebook-group" style={{ marginTop: 24 }}>
                    <h3>เพิ่มกลุ่มส่วนงานใหม่</h3>
                    <form className="inline-form" onSubmit={handleCreateGroup}>
                        <input
                            placeholder="ชื่อกลุ่มส่วนงานใหม่"
                            value={newGroup.title}
                            onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                        />
                        <input
                            placeholder="ไอคอน (ชื่อ Lucide icon)"
                            value={newGroup.icon}
                            onChange={(e) => setNewGroup({ ...newGroup, icon: e.target.value })}
                        />
                        <input
                            placeholder="สีหลัก เช่น #FFD100"
                            value={newGroup.color}
                            onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                        />
                        <input
                            placeholder="สีพื้นหลัง เช่น rgba(255,209,0,0.1)"
                            value={newGroup.bgColor}
                            onChange={(e) => setNewGroup({ ...newGroup, bgColor: e.target.value })}
                        />
                        <button type="submit">สร้างกลุ่ม</button>
                    </form>
                </div>
            )}
        </div>
    );
}
