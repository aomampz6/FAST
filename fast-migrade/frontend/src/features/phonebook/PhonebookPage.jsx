import { useState } from 'react';
import { usePhonebook } from './usePhonebook';
import { useAuth } from '../../shared/auth/AuthContext';

const emptyGroup = { title: '', icon: '', color: '', bgColor: '' };
const emptyContact = { title: '', subtitle: '', phone: '', extension: '' };

export default function PhonebookPage() {
    const { groups, loading, error, createGroup, deleteGroup, addContact, updateContact, deleteContact } =
        usePhonebook();
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const [newGroup, setNewGroup] = useState(emptyGroup);
    const [contactDrafts, setContactDrafts] = useState({});
    const [editingContact, setEditingContact] = useState(null);

    if (loading) {
        return (
            <div className="page">
                <h2>สมุดโทรศัพท์</h2>
                <div className="page-loading">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" />
                    <div className="skeleton-line w-60" />
                </div>
            </div>
        );
    }
    if (error) return <div className="page error-banner">{error}</div>;

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

    return (
        <div className="page">
            <h2>สมุดโทรศัพท์</h2>
            <div className="phonebook-groups">
                {groups.map((group) => (
                    <div className="phonebook-group" key={group._id}>
                        <div className="group-header">
                            <h3>{group.title}</h3>
                            {isAdmin && (
                                <button className="danger" onClick={() => deleteGroup(group._id)}>
                                    ลบกลุ่ม
                                </button>
                            )}
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ชื่องาน/รายละเอียด</th>
                                    <th>รายละเอียดรอง</th>
                                    <th>เบอร์โทรศัพท์</th>
                                    <th>เบอร์ต่อ</th>
                                    {isAdmin && <th>จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {group.contacts.map((contact) => (
                                    <tr key={contact._id}>
                                        {editingContact?.groupId === group._id &&
                                        editingContact?.contactId === contact._id ? (
                                            <>
                                                <td>
                                                    <input
                                                        value={editingContact.data.title}
                                                        onChange={(e) =>
                                                            setEditingContact((prev) => ({
                                                                ...prev,
                                                                data: { ...prev.data, title: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        value={editingContact.data.subtitle || ''}
                                                        onChange={(e) =>
                                                            setEditingContact((prev) => ({
                                                                ...prev,
                                                                data: { ...prev.data, subtitle: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        value={editingContact.data.phone}
                                                        onChange={(e) =>
                                                            setEditingContact((prev) => ({
                                                                ...prev,
                                                                data: { ...prev.data, phone: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        value={editingContact.data.extension || ''}
                                                        onChange={(e) =>
                                                            setEditingContact((prev) => ({
                                                                ...prev,
                                                                data: { ...prev.data, extension: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <button onClick={(e) => handleUpdateContact(e, group._id, contact._id)}>
                                                        บันทึก
                                                    </button>
                                                    <button onClick={() => setEditingContact(null)}>ยกเลิก</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{contact.title}</td>
                                                <td>{contact.subtitle}</td>
                                                <td>{contact.phone}</td>
                                                <td>{contact.extension}</td>
                                                {isAdmin && (
                                                    <td>
                                                        <button
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
                                                            className="danger"
                                                            onClick={() => deleteContact(group._id, contact._id)}
                                                        >
                                                            ลบ
                                                        </button>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {group.contacts.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4}>ยังไม่มีข้อมูลเบอร์โทรศัพท์</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

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
                ))}
            </div>

            {isAdmin && (
                <div className="phonebook-group">
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
