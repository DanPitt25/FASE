import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

type SupportedLocale = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';

function loadTranslations(locale: SupportedLocale) {
  const filePath = path.join(process.cwd(), 'messages', locale, 'email.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent).bulletin_february_2026;
}

function generateLocalizedHtml(locale: SupportedLocale): string {
  const t = loadTranslations(locale);

  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${t.subject}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f4f4; }
    .wrapper { width: 100%; background-color: #f4f4f4; }
    .container { max-width: 640px; margin: 0 auto; }
    a { color: #14252f; text-decoration: underline; }
    a:hover { color: #dcbe73; }
    .btn {
      display: inline-block;
      background-color: #14252f;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      font-family: 'Trebuchet MS', Helvetica, sans-serif;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .btn:hover { background-color: #1e3a4a; }
    .btn-gold { background-color: #dcbe73; color: #14252f !important; }
    @media only screen and (max-width: 660px) {
      .container { width: 100% !important; }
      .content-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .stat-cell { display: block !important; width: 100% !important; margin-bottom: 4px; }
    }
  </style>
</head>
<body>
  <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" class="container" width="640" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">

          <!-- FASE LOGO BAR -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 20px 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE" width="180" style="display: block;">
            </td>
          </tr>

          <!-- HEADER IMAGE -->
          <tr>
            <td style="padding: 0; line-height: 0;">
              <img src="https://fasemga.com/bulletin/feb-2026/Bulletin-with-text.png" alt="${t.subject}" width="640" style="display: block; width: 100%; max-width: 640px;">
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td class="content-pad" style="padding: 36px 40px 24px 40px;">
              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; line-height: 28px; color: #14252f; margin: 0 0 14px 0;">
                ${t.welcome_intro}
              </p>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0;">
                ${t.welcome_summary}
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 2px solid #dcbe73; margin: 0;"></td></tr>

          <!-- ===== FEATURE: Lloyd's Europe ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #dcbe73; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">${t.feature}</p>
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0;">
                ${t.lloyds_title}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 40px 8px 40px;">
              <img src="https://fasemga.com/bulletin/feb-2026/lloyds-building.jpg" alt="Lloyd's of London" width="560" style="display: block; width: 100%; max-width: 560px;">
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="padding: 16px 40px 32px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0 0 16px 0;">
                ${t.lloyds_summary}
              </p>
              <a href="https://fasemga.com/member-portal/bulletin/february-2026/lloyds-europe" class="btn">${t.read_full_article}</a>
            </td>
          </tr>

          <!-- ===== LLOYD'S RESOURCES ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0 0 8px 0;">
                ${t.lloyds_resources_title}
              </h2>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0;">
                ${t.lloyds_resources_intro}
              </p>
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="padding: 16px 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f8f8f8; padding: 16px 18px;">
                    <a href="https://fasemga.com/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" style="text-decoration: none;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" valign="top">
                            <div style="width: 32px; height: 32px; background-color: #fde8e8; border-radius: 4px; text-align: center; line-height: 32px;">
                              <span style="color: #dc2626; font-size: 14px; font-weight: bold;">PDF</span>
                            </div>
                          </td>
                          <td valign="top">
                            <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0; font-weight: bold;">
                              ${t.lloyds_datapoints_title}
                            </p>
                            <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                              ${t.lloyds_datapoints_desc}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 16px 18px;">
                    <a href="https://fasemga.com/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" style="text-decoration: none;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" valign="top">
                            <div style="width: 32px; height: 32px; background-color: #fde8e8; border-radius: 4px; text-align: center; line-height: 32px;">
                              <span style="color: #dc2626; font-size: 14px; font-weight: bold;">PDF</span>
                            </div>
                          </td>
                          <td valign="top">
                            <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0; font-weight: bold;">
                              ${t.lloyds_da_title}
                            </p>
                            <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                              ${t.lloyds_da_desc}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 2px solid #dcbe73; margin: 0;"></td></tr>

          <!-- ===== CAPTIVES ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #dcbe73; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">${t.contributed_article}</p>
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0;">
                ${t.captives_title}
              </h2>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #888888; margin: 8px 0 0 0;">
                By Mark Elliott, Polo Insurance Managers
              </p>
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="padding: 16px 40px 32px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0 0 16px 0;">
                ${t.captives_summary}
              </p>
              <a href="https://fasemga.com/member-portal/bulletin/february-2026/captives" class="btn">${t.read_full_article}</a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 2px solid #dcbe73; margin: 0;"></td></tr>

          <!-- ===== MEMBER NEWS ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0 0 16px 0;">
                ${t.member_news_title}
              </h2>
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f8f8f8; padding: 14px 18px; border-bottom: 1px solid #e8e8e8;">
                    <a href="https://www.risingedge.co/news/redo" style="text-decoration: none;">
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0;">
                        ${t.member_news_1_title}
                      </p>
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                        ${t.member_news_1_source}
                      </p>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 14px 18px; border-bottom: 1px solid #e8e8e8;">
                    <a href="https://www.dualgroup.com/news-and-media/dual-europe-strengthens-transactional-liability-team" style="text-decoration: none;">
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0;">
                        ${t.member_news_2_title}
                      </p>
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                        ${t.member_news_2_source}
                      </p>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 14px 18px; border-bottom: 1px solid #e8e8e8;">
                    <a href="https://blog.optiogroup.com/news/optio-strengthens-scandinavian-presence-with-ags-forsikring-as-acquisition" style="text-decoration: none;">
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0;">
                        ${t.member_news_3_title}
                      </p>
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                        ${t.member_news_3_source}
                      </p>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 14px 18px; border-bottom: 1px solid #e8e8e8;">
                    <a href="https://www.victorinsurance.com/us/about/media-center/victor-insurance-uk-strengthens-property-offering--expanding-ris.html" style="text-decoration: none;">
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0;">
                        ${t.member_news_4_title}
                      </p>
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                        ${t.member_news_4_source}
                      </p>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 14px 18px;">
                    <a href="https://www.siriuspt.com/mgaa-siriuspoint-panel-the-rise-of-delegated-authority-at-lloyds/" style="text-decoration: none;">
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #14252f; margin: 0;">
                        ${t.member_news_5_title}
                      </p>
                      <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; margin: 4px 0 0 0;">
                        ${t.member_news_5_source}
                      </p>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 2px solid #dcbe73; margin: 0;"></td></tr>

          <!-- ===== FASE BY THE NUMBERS ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #dcbe73; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">${t.our_community}</p>
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0 0 20px 0;">
                ${t.fase_numbers_title}
              </h2>
            </td>
          </tr>

          <!-- Stats boxes -->
          <tr>
            <td style="padding: 0 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="stat-cell" width="32%" align="center" valign="top" style="padding: 16px 8px; background-color: #14252f;">
                    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 38px; color: #dcbe73; margin: 0; line-height: 42px;">82</p>
                    <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin: 6px 0 0 0;">${t.members}</p>
                  </td>
                  <td width="2%" style="background-color: #ffffff;">&nbsp;</td>
                  <td class="stat-cell" width="32%" align="center" valign="top" style="padding: 16px 8px; background-color: #14252f;">
                    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 38px; color: #dcbe73; margin: 0; line-height: 42px;">13</p>
                    <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin: 6px 0 0 0;">${t.countries}</p>
                  </td>
                  <td width="2%" style="background-color: #ffffff;">&nbsp;</td>
                  <td class="stat-cell" width="32%" align="center" valign="top" style="padding: 16px 8px; background-color: #14252f;">
                    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 38px; color: #dcbe73; margin: 0; line-height: 42px;">24</p>
                    <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin: 6px 0 0 0;">${t.lines_of_business}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="content-pad" style="padding: 16px 40px 24px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0;">
                ${t.fase_numbers_summary}
              </p>
            </td>
          </tr>

          <!-- Charts -->
          <tr>
            <td style="padding: 0 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0;">${t.members_by_country}</p>
              <img src="https://fasemga.com/bulletin/feb-2026/mga-countries.png" alt="Members by Country" width="500" style="display: block; width: 100%; max-width: 500px;">
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 40px 24px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0;">${t.top_lines_of_business}</p>
              <img src="https://fasemga.com/bulletin/feb-2026/mga-lob.png" alt="Top Lines of Business" width="500" style="display: block; width: 100%; max-width: 500px;">
            </td>
          </tr>

          <tr>
            <td class="content-pad" style="padding: 0 40px 32px 40px;">
              <a href="https://fasemga.com/member-portal" class="btn btn-gold">${t.view_directory}</a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 2px solid #dcbe73; margin: 0;"></td></tr>

          <!-- ===== MGA RENDEZVOUS ===== -->
          <tr>
            <td class="content-pad" style="padding: 32px 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #dcbe73; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">${t.event_update}</p>
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #14252f; margin: 0;">
                ${t.rendezvous_title}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 40px 8px 40px;">
              <img src="https://fasemga.com/mga-rendezvous-cathedral.jpg" alt="MGA Rendezvous Barcelona" width="560" style="display: block; width: 100%; max-width: 560px;">
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="padding: 16px 40px 12px 40px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0 0 16px 0;">
                ${t.rendezvous_summary_1}
              </p>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0 0 16px 0;">
                ${t.rendezvous_summary_2}
              </p>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #444444; margin: 0 0 16px 0;">
                ${t.rendezvous_discount}
              </p>
              <a href="https://mgarendezvous.com/register" class="btn btn-gold">${t.register_now}</a>
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="background-color: #14252f; padding: 32px 40px; text-align: center;">
              <img src="https://fasemga.com/fase-logo-mark.png" alt="FASE" width="60" style="display: inline-block; margin-bottom: 16px;">
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8fa8b8; margin: 0 0 12px 0;">
                Fédération des Agences de Souscription Européennes
              </p>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #6b8a9b; margin: 0 0 8px 0;">
                Herengracht 124-128, 1015 BT Amsterdam
              </p>
              <p style="margin: 16px 0;">
                <a href="https://fasemga.com" style="color: #dcbe73; text-decoration: none; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; margin: 0 10px;">Website</a>
                &nbsp;&nbsp;
                <a href="https://www.linkedin.com/company/fasemga/" style="color: #dcbe73; text-decoration: none; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; margin: 0 10px;">LinkedIn</a>
                &nbsp;&nbsp;
                <a href="mailto:admin@fasemga.com" style="color: #dcbe73; text-decoration: none; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; margin: 0 10px;">Contact</a>
              </p>
              <p style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 11px; line-height: 16px; color: #4a6a7a; margin: 16px 0 0 0;">
                © 2026 FASE B.V. All rights reserved.<br>
                <a href="#" style="color: #4a6a7a; text-decoration: underline;">Unsubscribe</a> &nbsp;|&nbsp; <a href="https://fasemga.com/privacy-policy" style="color: #4a6a7a; text-decoration: underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, cc, userLocale, preview } = await request.json();

    const locale = (userLocale || 'en') as SupportedLocale;
    const supportedLocales: SupportedLocale[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];

    if (!supportedLocales.includes(locale)) {
      return NextResponse.json({ error: `Unsupported locale: ${locale}` }, { status: 400 });
    }

    const t = loadTranslations(locale);
    const htmlContent = generateLocalizedHtml(locale);

    // If preview mode, return preview data
    if (preview) {
      return NextResponse.json({
        success: true,
        to: email,
        cc: cc || undefined,
        subject: t.subject,
        htmlContent: htmlContent
      });
    }

    // Validate email for send mode
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const emailPayload: any = {
      from: 'FASE <admin@fasemga.com>',
      to: email,
      subject: t.subject,
      html: htmlContent
    };

    if (cc) {
      emailPayload.cc = cc;
    }

    console.log(`Sending bulletin email in ${locale.toUpperCase()} to ${email}...`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send bulletin email: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `Failed to send email: ${errorText}` }, { status: 500 });
    }

    const result = await response.json();
    console.log('Bulletin email sent successfully! ID:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Bulletin email sent successfully',
      emailId: result.id
    });
  } catch (error: any) {
    console.error('Bulletin email function failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
