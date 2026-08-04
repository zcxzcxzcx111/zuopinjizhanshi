$content = Get-Content styles.css | Select-Object -First 1472
Set-Content styles.css $content
$iphoneCss = Get-Content "..\公众号编写\styles.css" | Select-Object -Skip 664 -First 114
Add-Content styles.css "`n/* iPhone Frame Mobile Demo from WeChat Project */"
Add-Content styles.css $iphoneCss
