-- Session-type terms & conditions (admin-editable, shown at checkout)
ALTER TABLE class_types ADD COLUMN IF NOT EXISTS terms_and_conditions text;

UPDATE class_types
SET terms_and_conditions = 'The sessions are non-refundable. If there is a no-show by the instructor, an alternative session will be arranged to compensate for the session. You can also choose to convert that session into credits, which you can use for any other bookings on the platform.'
WHERE terms_and_conditions IS NULL OR trim(terms_and_conditions) = '';
