import PhonebookPage from '../phonebook/PhonebookPage';

// The Phonebook feature already renders full CRUD controls when the logged-in
// user is an admin, so the admin tab simply reuses that page.
export default function AdminPhonebookTab() {
    return <PhonebookPage />;
}
