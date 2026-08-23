# Photography Edit Object-Key Validation Design

## Goal

Allow an administrator to save edits to existing photography content when its
stored OSS object key does not match the current upload naming convention.
Continue validating that content is complete and that user-entered metadata is
well formed.

## Scope

The change applies to the admin content draft schema used by create and update
actions. It does not change OSS signing, file conversion, file MIME checks, or
file-size limits.

## Validation Rules

- Photos and videos still require a non-empty media object key.
- A media object key must be a relative OSS object path: it may not contain a
  URL scheme, a leading slash, an empty path segment, or a `.` / `..` segment.
- The object key is no longer constrained to the directory, date, filename, or
  extension emitted by the current upload signer.
- Existing validation for content kind, title, slug, dates, numbers, and
  location completeness remains unchanged.
- Newly selected media continues through the existing upload-signature policy,
  which determines permitted MIME types, file sizes, and the new object key.

## Data Flow

1. The edit form submits the stored object key when no replacement file was
   selected, or the key returned by the upload signer when there was one.
2. The server action converts form data into an admin content draft.
3. The draft schema validates the safe relative object-key shape and all other
   content fields before calling the content update service.
4. The update service persists the key and only removes a previous OSS object
   after a successful replacement.

## Error Handling

Invalid content remains rejected by the server action and presents the existing
content-validation message. A previously stored key that is a safe relative
path is accepted even if it uses a legacy location or file extension.

## Tests

Add focused domain tests for the content draft parser:

- a legacy photo object key is accepted with otherwise valid photo data;
- an empty photo object key is rejected;
- an absolute URL and traversal-shaped object keys are rejected;
- current metadata and location validation remain enforced.
