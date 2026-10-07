$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$items = @(
  @('data-science','Data Science','#0D6E6E'), @('artificial-intelligence','Artificial Intelligence','#147D9C'),
  @('machine-learning','Machine Learning','#7B5C9C'), @('data-analytics','Data Analytics','#1976A2'),
  @('python-development','Python Development','#356E9A'), @('web-development','Web Development','#B2673C'),
  @('full-stack-development','Full Stack Development','#9A573F'), @('frontend-development','Frontend Development','#AD5A70'),
  @('backend-development','Backend Development','#4B7A5A'), @('cloud-computing','Cloud Computing','#586CC0'),
  @('devops','DevOps','#0B7F83'), @('cyber-security','Cyber Security','#9B4D1A'), @('ui-ux-design','UI/UX Design','#A73D6A'),
  @('generative-ai','Generative AI','#6B4BB5'), @('nlp','NLP','#3A689F'), @('computer-vision','Computer Vision','#C8582A'),
  @('business-analytics','Business Analytics','#806D13'), @('software-testing','Software Testing','#41656E'),
  @('forward-deployed-engineer','Forward Deployed Engineer','#765E42'), @('product-management','Product Management','#A14F35'),
  @('mobile-app-development','Mobile App Development','#226F54'), @('big-data-engineering','Big Data Engineering','#1F5F8B'),
  @('deep-learning','Deep Learning','#7B2CBF'), @('blockchain-development','Blockchain Development','#2A6F97'),
  @('sre','Site Reliability Engineering','#246B68'), @('ethical-hacking','Ethical Hacking & Pen Testing','#1C6B58'),
  @('embedded-iot','Embedded Systems & IoT','#2A6F97'), @('systems-rust','Systems Programming in Rust','#A3481F'),
  @('game-development','Game Development','#6A4C93'), @('digital-marketing','Digital Marketing & Growth','#1D7874'),
  @('api-microservices','API & Microservices Architecture','#2B5C8F'), @('bioinformatics','Bioinformatics & Computational Biology','#1F6F8B')
)
$out = Join-Path $PSScriptRoot '..\public\og'
New-Item -ItemType Directory -Force -Path $out | Out-Null
foreach ($item in $items) {
  $image = [System.Drawing.Bitmap]::new(1200,630)
  $g = [System.Drawing.Graphics]::FromImage($image)
  $g.Clear([System.Drawing.Color]::FromArgb(11,31,54))
  $accent = [System.Drawing.ColorTranslator]::FromHtml($item[2])
  $pen = [System.Drawing.Pen]::new($accent,3)
  foreach($x in 0..12){$g.DrawLine($pen,$x*100,0,$x*100,630)}
  foreach($y in 0..6){$g.DrawLine($pen,0,$y*100,1200,$y*100)}
  $display = [System.Drawing.Font]::new('Arial',48,[System.Drawing.FontStyle]::Bold)
  $body = [System.Drawing.Font]::new('Arial',24,[System.Drawing.FontStyle]::Regular)
  $accentBrush = [System.Drawing.SolidBrush]::new($accent)
  $white = [System.Drawing.Brushes]::White
  $g.DrawString('HIREEBRIDGE  /  PROJECT-BASED INTERNSHIP PROGRAMME',$body,$accentBrush,80,104)
  $g.DrawString($item[1],$display,$white,80,210)
  $g.DrawString('Online internship project with certificate',$body,$white,80,290)
  $g.DrawRectangle($pen,80,380,1040,1)
  $g.DrawString('Student decision information  /  fee-based  /  not employment',$body,$white,80,420)
  $g.Dispose(); $image.Save((Join-Path $out "$($item[0]).png"),[System.Drawing.Imaging.ImageFormat]::Png); $image.Dispose()
}
