---
"@ludovicm67/simple-whiteboard": minor
---

Ask for confirmation before the clear tool empties the board, instead of wiping
it on the first click. The dialog is a native modal `<dialog>`, so it traps
focus, closes on Escape and hands focus back to the button that opened it;
cancelling — with the button, Escape, or a click outside the panel — leaves
both the board and the previously selected tool untouched.
An already empty board still clears straight away, since there is nothing to
lose, and the new `skip-clear-confirmation` attribute turns the dialog off
for apps that have their own safeguards. Tools can reuse the same dialog
through the new `confirm()` method.
