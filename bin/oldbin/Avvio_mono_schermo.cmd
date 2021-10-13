echo off

c:\windows\system32\ping.exe 1.1.1.1 -n 1 -w 10000 > nul
c:\windows\system32\ping.exe 1.1.1.1 -n 1 -w 10000 > nul
c:\windows\system32\ping.exe 1.1.1.1 -n 1 -w 10000 > nul
start c:\xampp\admin\bin\initialize.exe "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --incognito http://localhost:8080"
