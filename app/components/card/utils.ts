export const moveCursorToEnd = (element: HTMLElement) => {
  // Create a new 'Range' object. This will be used to specify the new cursor position.
  const range = document.createRange()

  // Get the current text or element selection in the document.
  const selection = window.getSelection()

  // If there's no selection object, exit the function to avoid errors.
  if (!selection) return

  // Set the range to cover all contents of the element. This is like selecting all text in the element.
  range.selectNodeContents(element)

  // Collapse the range to its end. This means moving the selection point to the end of the element's text.
  range.collapse(false)

  // Clear any existing text selections in the document to avoid conflicts.
  selection.removeAllRanges()

  // Apply the new range to the selection. This step actually moves the cursor to the end of the element.
  selection.addRange(range)
}
