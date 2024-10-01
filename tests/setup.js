import jQuery from 'jquery'

// Ensure global.window is defined (provided by jsdom)
global.window = window

// Attach jQuery to the window object
window.jQuery = jQuery
window.$ = jQuery // If needed

// Define other globals if necessary
