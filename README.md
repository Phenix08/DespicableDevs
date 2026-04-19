# DespicableDevs: OcenkoMAT

## ABOUT
**OcenkoMAT** is a **browser extension** that can be used on Slovenian student job websites to display their ratings and reviews. Students can read the reviews while browsing the adverts, while others that have worked those jobs can share their opinions about the working experience via our extension as well. This provides students with a much needed *context*, while the employers can use the *feedback* to improve their impressions with students and in doing that attract *more applicants*.

## TECH STACK
The main coding languages we used are **JavaScript**, **html** and **css**, while our backend uses *Flask* with **python**. For our database we used Firebase, where we have stored the collections of companies, reviews, and users. We also used Copilot in VS Code in addition to Gemini and ChatGPT to help us with code structuring, formatting, and debugging.

## FEATURES
Users can utilize the extension on websites of Slovenian student job websites (študentski servisi) to **read and write reviews**. The overall ratings appear **overlaid on the job adverts** next to our logo when browsing the sites. A pop up with a more **detailed overview** of the reviews and category ratings appears upon clicking on the graphic. Students can also **submit their reviews** either via the advert or the referrals and applications pages. If they choose the former, their review is *unverified*, since we cannot confirm whether or not they worked a certain job. To achieve that they have to submit a review from the referrals or applications page, where we can see that they truly applied or worked at a job, and therefore get a *verified review*. The review includes the **overall rating**, as well as ratings for individual categories of work environment, location, communications, and flexibility. They can also add any additional **comments** they might have and, in the case of verified reviews, choose to be *anonymous*. Other users can then like or dislike other reviews. Our extension currently supports [e-študentski servis](https://www.studentski-servis.com/studenti/) and [Mjob](https://www.mjob.si/), where the user interface changes slightly based on the underlying website's interface, making for a more *integrated user experience*.

## SETUP
To run the server locally:
- to insure all python libraries are installed use: pip install -r requirements.txt in the root directory
- run the server by typing: python (or py) app.py
  
To use our browser extension:
- It is recommended that you use **Google Chrome** or a Chromium-based browser
- Search for chrome://extensions and click on 'Load unpacked', then select the folder where the code is
- Go to the [website URL](https://www.studentski-servis.com/studenti/) or https://www.mjob.si/ and log into a student account
- *Inform and be informed :)*

## CHALLENGES & LEARNING
We practiced and improved our Python, JavaScript, HTML, and CSS skills, as well as refreshed our Firebase knowledge. We built a browser extension for the first time and learnt how to intergrate it over an existing website in a user-friendly manner. We also got better at using AI to help us write code more efficiently and help us with debugging.

## FUTURE IMPROVEMENTS
In the future we would try to adapt the extension to other Slovenian student job websites and potentially collaborate with them, thus getting access to their actual databases and removing the need to scrape HTML to obtain data. If applicable, the extension could also be used internationally, where similar sites exist. 
