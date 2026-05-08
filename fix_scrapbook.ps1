$content = Get-Content "scrapbook.html" -Raw -Encoding UTF8

# Fix garbled page number dash (â€" is the UTF-8 mojibake for em-dash –)
# Replace the whole page number style + content pattern
$old1 = "font-size:.6rem;color:#8b6914;opacity:.5;`">'+(slice.start+1)+' â€" '+(slice.start+slice.count)+'"
$new1 = "font-size:.75rem;color:#8b6914;opacity:.8;z-index:10;background:rgba(253,246,227,.7);padding:1px 5px;border-radius:4px;`">'+(slice.start+1)+'-'+(slice.start+slice.count)+'"

# Fix garbled spread indicator (â€" and Â· are mojibake for – and ·)
$old2 = "startItem + `"â€`"` + endItem"
$new2 = 'startItem + "-" + endItem'

$old3 = "`"  Â·  items `""
$new3 = '`"  *  items `"'

$old4 = ": `"â€`"`""
$new4 = ': `"-`"'

$old5 = "(leftSlice ? leftSlice.start + leftSlice.count : `"â€`"")"
$new5 = '(leftSlice ? leftSlice.start + leftSlice.count : `"-`")'

if ($content.Contains("â€")) {
  Write-Host "Found garbled characters, fixing..."
  # Use byte-level replacement
  $bytes = [System.IO.File]::ReadAllBytes("scrapbook.html")
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  
  # Replace garbled en-dash (â€") with plain hyphen
  $text = $text -replace [regex]::Escape("â€"), "-"
  # Replace garbled middle dot (Â·) with asterisk  
  $text = $text -replace [regex]::Escape("Â·"), "*"
  # Fix opacity and size of page number
  $text = $text -replace [regex]::Escape("font-size:.6rem;color:#8b6914;opacity:.5;"), "font-size:.75rem;color:#8b6914;opacity:.8;z-index:10;background:rgba(253,246,227,.7);padding:1px 5px;border-radius:4px;"
  
  [System.IO.File]::WriteAllBytes("scrapbook_fixed.html", [System.Text.Encoding]::UTF8.GetBytes($text))
  Move-Item -Force "scrapbook_fixed.html" "scrapbook.html"
  Write-Host "Done."
} else {
  Write-Host "No garbled characters found."
}
