param(
  [string]$Subject = "CN=diy-bath dev (Rocktier)",
  [int]$Months = 12,
  [string]$PfxPath = ""
)

# 生成本地开发用的自签名代码签名证书，并导出 pfx。
#
# 这是「开发期」用途：Windows SmartScreen 只对未签名程序弹黄色警告，
# 自签名能让本地/内部分发少一道坎，但对公众分发没有意义——
# 公众分发需要买 OV 代码签名证书（约 2000-5000 元/年）。
#
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts/make-dev-cert.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/make-dev-cert.ps1 -Months 3
#
# 私钥口令写死在脚本里，所以这只适合开发机。产物不要提交进仓库。

$ErrorActionPreference = 'Stop'
$Password = ConvertTo-SecureString -String 'diy-bath-dev' -Force -AsPlainText

$cert = New-SelfSignedCertificate `
  -Subject $Subject `
  -Type CodeSigningCert `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -NotAfter (Get-Date).AddMonths($Months) `
  -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3')

Write-Host "已创建证书: $($cert.Subject)"
Write-Host "Thumbprint : $($cert.Thumbprint)"
Write-Host "有效期至   : $($cert.NotAfter)"

if ($PfxPath -ne "") {
  Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $Password | Out-Null
  Write-Host "已导出 pfx: $PfxPath"
}

Write-Host ''
Write-Host '签名某个 exe:'
Write-Host "  signtool sign /sha1 $($cert.Thumbprint) /fd SHA256 /td SHA256 `"path\to\app.exe`""
Write-Host '从证书库里删掉:'
Write-Host "  Remove-Item `"Cert:\CurrentUser\My\$($cert.Thumbprint)`""