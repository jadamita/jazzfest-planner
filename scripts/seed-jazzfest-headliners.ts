import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

import { config } from "dotenv";
config({ path: ".env.local" });

interface JazzFestArtist {
  date: string;
  artist: string;
  isHeadliner: boolean;
}

// All Jazz Fest artists - headliners marked with isHeadliner: true
const JAZZ_FEST_ARTISTS: JazzFestArtist[] = [
  // ==================== APRIL 23 ====================
  // Headliners
  { date: "2025-04-23", artist: "Kings of Leon", isHeadliner: true },
  { date: "2025-04-23", artist: "Raye", isHeadliner: true },
  { date: "2025-04-23", artist: "Stephen Marley", isHeadliner: true },
  { date: "2025-04-23", artist: "Preservation Hall Jazz Band", isHeadliner: true },
  { date: "2025-04-23", artist: "Blind Boys of Alabama", isHeadliner: true },
  { date: "2025-04-23", artist: "Cowboy Mouth", isHeadliner: true },
  { date: "2025-04-23", artist: "Charlie Musselwhite & GA-20", isHeadliner: true },
  // Other acts
  { date: "2025-04-23", artist: "Monty Alexander \"Jamericana\"", isHeadliner: false },
  { date: "2025-04-23", artist: "Rik Jam and The Island Federation", isHeadliner: false },
  { date: "2025-04-23", artist: "Silver Birds Steel Orchestra", isHeadliner: false },
  { date: "2025-04-23", artist: "Cimafunk", isHeadliner: false },
  { date: "2025-04-23", artist: "Maggie Koerner", isHeadliner: false },
  { date: "2025-04-23", artist: "Nicholas Payton featuring Butcher Brown", isHeadliner: false },
  { date: "2025-04-23", artist: "Big Chief Donald Harrison", isHeadliner: false },
  { date: "2025-04-23", artist: "Kyle Roussel", isHeadliner: false },
  { date: "2025-04-23", artist: "Vieux Farka Touré", isHeadliner: false },
  { date: "2025-04-23", artist: "Nidia Góngora", isHeadliner: false },
  { date: "2025-04-23", artist: "Chubby Carrier & the Bayou Swamp Band", isHeadliner: false },
  { date: "2025-04-23", artist: "Lena Prima & TLP Band", isHeadliner: false },
  { date: "2025-04-23", artist: "Kenny Neal", isHeadliner: false },
  { date: "2025-04-23", artist: "Brass-A-Holics", isHeadliner: false },
  { date: "2025-04-23", artist: "Johnny Sketch & The Dirty Notes", isHeadliner: false },
  { date: "2025-04-23", artist: "Sierra Green and The Giants", isHeadliner: false },
  { date: "2025-04-23", artist: "Gregg Stafford's Jazz Hounds", isHeadliner: false },
  { date: "2025-04-23", artist: "Shinyribs", isHeadliner: false },
  { date: "2025-04-23", artist: "Quiana Lynell", isHeadliner: false },
  { date: "2025-04-23", artist: "Omari Neville & The Fuel", isHeadliner: false },
  { date: "2025-04-23", artist: "Jeffery Broussard & The Creole Cowboys", isHeadliner: false },
  { date: "2025-04-23", artist: "Aurora Nealand's Royal Roses", isHeadliner: false },
  { date: "2025-04-23", artist: "T'Monde", isHeadliner: false },

  // ==================== APRIL 24 ====================
  // Headliners
  { date: "2025-04-24", artist: "Jon Batiste", isHeadliner: true },
  { date: "2025-04-24", artist: "Lorde", isHeadliner: true },
  { date: "2025-04-24", artist: "Sean Paul", isHeadliner: true },
  { date: "2025-04-24", artist: "Big Freedia", isHeadliner: true },
  { date: "2025-04-24", artist: "Ani DiFranco", isHeadliner: true },
  { date: "2025-04-24", artist: "Cyril Neville – The Uptown Ruler", isHeadliner: true },
  { date: "2025-04-24", artist: "The Dirty Dozen Brass Band", isHeadliner: true },
  { date: "2025-04-24", artist: "Hiromi's Sonicwonder", isHeadliner: true },
  // Other acts
  { date: "2025-04-24", artist: "Lil' Ed & The Blues Imperials", isHeadliner: false },
  { date: "2025-04-24", artist: "The Dixie Cups", isHeadliner: false },
  { date: "2025-04-24", artist: "Wanda Rouzan", isHeadliner: false },
  { date: "2025-04-24", artist: "GIVERS", isHeadliner: false },
  { date: "2025-04-24", artist: "Protoje", isHeadliner: false },
  { date: "2025-04-24", artist: "Treme Brass Band", isHeadliner: false },
  { date: "2025-04-24", artist: "Lost Bayou Ramblers", isHeadliner: false },
  { date: "2025-04-24", artist: "Papa Mali's Shantytown Underground", isHeadliner: false },
  { date: "2025-04-24", artist: "Bon Bon Vivant", isHeadliner: false },
  { date: "2025-04-24", artist: "Jonathon \"Boogie\" Long", isHeadliner: false },
  { date: "2025-04-24", artist: "Billy Iuso", isHeadliner: false },
  { date: "2025-04-24", artist: "Al \"Lil Fats\" Jackson", isHeadliner: false },
  { date: "2025-04-24", artist: "Jason Neville Funky Soul Allstar Band", isHeadliner: false },
  { date: "2025-04-24", artist: "Astral Project", isHeadliner: false },
  { date: "2025-04-24", artist: "Adonis Rose & The New Orleans Jazz Orchestra", isHeadliner: false },
  { date: "2025-04-24", artist: "Los Skarnales", isHeadliner: false },
  { date: "2025-04-24", artist: "Seratones", isHeadliner: false },
  { date: "2025-04-24", artist: "Jesse McBride Big Band", isHeadliner: false },
  { date: "2025-04-24", artist: "Joy Clark", isHeadliner: false },
  { date: "2025-04-24", artist: "Rosie Ledet", isHeadliner: false },
  { date: "2025-04-24", artist: "Loose Cattle", isHeadliner: false },
  { date: "2025-04-24", artist: "Naughty Professor", isHeadliner: false },
  { date: "2025-04-24", artist: "TBC Brass Band", isHeadliner: false },
  { date: "2025-04-24", artist: "Free Agents Brass Band", isHeadliner: false },
  { date: "2025-04-24", artist: "Louis Michot & Swamp Magic", isHeadliner: false },
  { date: "2025-04-24", artist: "Smoking Time Jazz Club", isHeadliner: false },

  // ==================== APRIL 25 ====================
  // Headliners
  { date: "2025-04-25", artist: "Stevie Nicks", isHeadliner: true },
  { date: "2025-04-25", artist: "Tyler Childers", isHeadliner: true },
  { date: "2025-04-25", artist: "Nas", isHeadliner: true },
  { date: "2025-04-25", artist: "Jason Isbell and the 400 Unit", isHeadliner: true },
  { date: "2025-04-25", artist: "Rhiannon Giddens", isHeadliner: true },
  { date: "2025-04-25", artist: "The Revivalists", isHeadliner: true },
  { date: "2025-04-25", artist: "Bruce Hornsby & the Noisemakers", isHeadliner: true },
  { date: "2025-04-25", artist: "Burning Spear", isHeadliner: true },
  { date: "2025-04-25", artist: "Dave Koz & Friends Summer Horns", isHeadliner: true },
  // Other acts
  { date: "2025-04-25", artist: "Samantha Fish", isHeadliner: false },
  { date: "2025-04-25", artist: "John Boutté", isHeadliner: false },
  { date: "2025-04-25", artist: "Kermit Ruffins & the BBQ Swingers", isHeadliner: false },
  { date: "2025-04-25", artist: "Sonny Landreth", isHeadliner: false },
  { date: "2025-04-25", artist: "Crowe Boys", isHeadliner: false },
  { date: "2025-04-25", artist: "Dwayne Dopsie & the Zydeco Hellraisers", isHeadliner: false },
  { date: "2025-04-25", artist: "Davell Crawford", isHeadliner: false },
  { date: "2025-04-25", artist: "Lutan Fyah", isHeadliner: false },
  { date: "2025-04-25", artist: "Bishop Paul S. Morton", isHeadliner: false },
  { date: "2025-04-25", artist: "HaSizzle", isHeadliner: false },
  { date: "2025-04-25", artist: "James Rivers Movement", isHeadliner: false },
  { date: "2025-04-25", artist: "Pine Leaf Boys", isHeadliner: false },
  { date: "2025-04-25", artist: "Doctor Nativo", isHeadliner: false },
  { date: "2025-04-25", artist: "Stooges Brass Band", isHeadliner: false },
  { date: "2025-04-25", artist: "Tin Men", isHeadliner: false },
  { date: "2025-04-25", artist: "Curley Taylor and Zydeco Trouble", isHeadliner: false },
  { date: "2025-04-25", artist: "Little Freddie King Blues Band", isHeadliner: false },
  { date: "2025-04-25", artist: "Don Vappie's Creole Jazz Serenaders", isHeadliner: false },
  { date: "2025-04-25", artist: "The Deslondes", isHeadliner: false },
  { date: "2025-04-25", artist: "Preservation Brass", isHeadliner: false },
  { date: "2025-04-25", artist: "Big 6 Brass Band", isHeadliner: false },
  { date: "2025-04-25", artist: "Rumba Buena", isHeadliner: false },

  // ==================== APRIL 26 ====================
  // Headliners
  { date: "2025-04-26", artist: "Rod Stewart", isHeadliner: true },
  { date: "2025-04-26", artist: "David Byrne", isHeadliner: true },
  { date: "2025-04-26", artist: "St. Vincent", isHeadliner: true },
  { date: "2025-04-26", artist: "The Isley Brothers", isHeadliner: true },
  { date: "2025-04-26", artist: "Irma Thomas", isHeadliner: true },
  { date: "2025-04-26", artist: "Jon Batiste presents Swamp", isHeadliner: true },
  { date: "2025-04-26", artist: "Carlos Vives", isHeadliner: true },
  { date: "2025-04-26", artist: "Ron Carter Quartet", isHeadliner: true },
  { date: "2025-04-26", artist: "Shirley Caesar", isHeadliner: true },
  // Other acts
  { date: "2025-04-26", artist: "Boyfriend", isHeadliner: false },
  { date: "2025-04-26", artist: "Leftover Salmon", isHeadliner: false },
  { date: "2025-04-26", artist: "Catherine Russell", isHeadliner: false },
  { date: "2025-04-26", artist: "Marcia Ball", isHeadliner: false },
  { date: "2025-04-26", artist: "Big Chief Monk Boudreaux & The Golden Eagles", isHeadliner: false },
  { date: "2025-04-26", artist: "Luciano", isHeadliner: false },
  { date: "2025-04-26", artist: "Rockin' Dopsie, Jr. & the Zydeco Twisters", isHeadliner: false },
  { date: "2025-04-26", artist: "Zachary Richard", isHeadliner: false },
  { date: "2025-04-26", artist: "Glen David Andrews Band", isHeadliner: false },
  { date: "2025-04-26", artist: "Dr. Michael White's Original Liberty Jazz Band", isHeadliner: false },
  { date: "2025-04-26", artist: "New Birth Brass Band", isHeadliner: false },
  { date: "2025-04-26", artist: "The New Orleans Klezmer Allstars", isHeadliner: false },
  { date: "2025-04-26", artist: "New Orleans Nightcrawlers", isHeadliner: false },
  { date: "2025-04-26", artist: "Kristin Diable & The City", isHeadliner: false },
  { date: "2025-04-26", artist: "People Museum", isHeadliner: false },
  { date: "2025-04-26", artist: "Paul Sanchez", isHeadliner: false },
  { date: "2025-04-26", artist: "The Headhunters", isHeadliner: false },
  { date: "2025-04-26", artist: "The Zion Harmonizers", isHeadliner: false },
  { date: "2025-04-26", artist: "Tuba Skinny", isHeadliner: false },
  { date: "2025-04-26", artist: "Erica Falls", isHeadliner: false },
  { date: "2025-04-26", artist: "Chris Thomas King", isHeadliner: false },
  { date: "2025-04-26", artist: "Fi Yi Yi & the Mandingo Warriors", isHeadliner: false },
  { date: "2025-04-26", artist: "Kinfolk Brass Band", isHeadliner: false },
  { date: "2025-04-26", artist: "Young Pinstripe Brass Band", isHeadliner: false },
  { date: "2025-04-26", artist: "Horace Trahan & the Ossun Express", isHeadliner: false },
  { date: "2025-04-26", artist: "Trombone Shorty Academy", isHeadliner: false },

  // ==================== APRIL 30 ====================
  // Headliners
  { date: "2025-04-30", artist: "Widespread Panic", isHeadliner: true },
  { date: "2025-04-30", artist: "Lake Street Dive", isHeadliner: true },
  { date: "2025-04-30", artist: "Leela James", isHeadliner: true },
  { date: "2025-04-30", artist: "Lettuce", isHeadliner: true },
  { date: "2025-04-30", artist: "Grace Bowers", isHeadliner: true },
  { date: "2025-04-30", artist: "Sweet Crude", isHeadliner: true },
  { date: "2025-04-30", artist: "Fred Wesley and his New JBs", isHeadliner: true },
  { date: "2025-04-30", artist: "Alejandro Escovedo", isHeadliner: true },
  // Other acts
  { date: "2025-04-30", artist: "Buckwheat Zydeco Jr.", isHeadliner: false },
  { date: "2025-04-30", artist: "Zigaboo Modeliste Funk Revue", isHeadliner: false },
  { date: "2025-04-30", artist: "Jourdan Thibodeaux et Les Rôdailleurs", isHeadliner: false },
  { date: "2025-04-30", artist: "Judith Owen & The Callers", isHeadliner: false },
  { date: "2025-04-30", artist: "Mike Zito Band", isHeadliner: false },
  { date: "2025-04-30", artist: "Tonya Boyd-Cannon", isHeadliner: false },
  { date: "2025-04-30", artist: "Terrance Simien & the Zydeco Experience", isHeadliner: false },
  { date: "2025-04-30", artist: "Batiste Brothers Band", isHeadliner: false },
  { date: "2025-04-30", artist: "Isaiah Collier", isHeadliner: false },
  { date: "2025-04-30", artist: "The Tropicales ft. Mireya Ramos", isHeadliner: false },
  { date: "2025-04-30", artist: "Charmaine Neville", isHeadliner: false },
  { date: "2025-04-30", artist: "Jesse Royal", isHeadliner: false },
  { date: "2025-04-30", artist: "Higher Heights Reggae", isHeadliner: false },
  { date: "2025-04-30", artist: "The Iguanas", isHeadliner: false },
  { date: "2025-04-30", artist: "John \"Papa\" Gros", isHeadliner: false },
  { date: "2025-04-30", artist: "The Iceman Special", isHeadliner: false },
  { date: "2025-04-30", artist: "Flagboy Giz", isHeadliner: false },
  { date: "2025-04-30", artist: "Frank Waln", isHeadliner: false },
  { date: "2025-04-30", artist: "New Breed Brass Band", isHeadliner: false },
  { date: "2025-04-30", artist: "Cedric Watson et Bijou Créole", isHeadliner: false },
  { date: "2025-04-30", artist: "Grayson Capps", isHeadliner: false },
  { date: "2025-04-30", artist: "Johnny Sansone", isHeadliner: false },
  { date: "2025-04-30", artist: "Soul Brass Band", isHeadliner: false },
  { date: "2025-04-30", artist: "Hot Club of New Orleans", isHeadliner: false },
  { date: "2025-04-30", artist: "Ingrid Lucia", isHeadliner: false },
  { date: "2025-04-30", artist: "The Palmetto Bug Stompers", isHeadliner: false },
  { date: "2025-04-30", artist: "Sons of Jazz Brass Band", isHeadliner: false },

  // ==================== MAY 1 ====================
  // Headliners
  { date: "2025-05-01", artist: "Lainey Wilson", isHeadliner: true },
  { date: "2025-05-01", artist: "The Black Keys", isHeadliner: true },
  { date: "2025-05-01", artist: "Ziggy Marley", isHeadliner: true },
  { date: "2025-05-01", artist: "Rickie Lee Jones", isHeadliner: true },
  { date: "2025-05-01", artist: "Terence Blanchard + Ravi Coltrane", isHeadliner: true },
  { date: "2025-05-01", artist: "Marc Broussard", isHeadliner: true },
  { date: "2025-05-01", artist: "Tab Benoit", isHeadliner: true },
  { date: "2025-05-01", artist: "Hot 8 Brass Band", isHeadliner: true },
  { date: "2025-05-01", artist: "Dragon Smoke", isHeadliner: true },
  // Other acts
  { date: "2025-05-01", artist: "Original Koffee", isHeadliner: false },
  { date: "2025-05-01", artist: "The California Honeydrops", isHeadliner: false },
  { date: "2025-05-01", artist: "BeauSoleil avec Michael Doucet", isHeadliner: false },
  { date: "2025-05-01", artist: "Jekalyn Carr", isHeadliner: false },
  { date: "2025-05-01", artist: "Bonerama", isHeadliner: false },
  { date: "2025-05-01", artist: "Cha Wa", isHeadliner: false },
  { date: "2025-05-01", artist: "Charlie Gabriel and Friends", isHeadliner: false },
  { date: "2025-05-01", artist: "The Skatalites", isHeadliner: false },
  { date: "2025-05-01", artist: "Bruce Daigrepoint Cajun Band", isHeadliner: false },
  { date: "2025-05-01", artist: "Amanda Shaw and The Cute Guys", isHeadliner: false },
  { date: "2025-05-01", artist: "Sue Foley", isHeadliner: false },
  { date: "2025-05-01", artist: "Gal Holiday & The Honky Tonk Revue", isHeadliner: false },
  { date: "2025-05-01", artist: "D.K. Harrell Band", isHeadliner: false },
  { date: "2025-05-01", artist: "Geno Delafose & French Rockin' Boogie", isHeadliner: false },
  { date: "2025-05-01", artist: "Tony Hall & The New Orleans Soul Stars", isHeadliner: false },
  { date: "2025-05-01", artist: "Gerald French & The Original Tuxedo Jazz Band", isHeadliner: false },
  { date: "2025-05-01", artist: "Meschiya Lake and the Little Big Horns", isHeadliner: false },
  { date: "2025-05-01", artist: "Debbie Davis and Friends", isHeadliner: false },
  { date: "2025-05-01", artist: "Corey Ledet Zydeco", isHeadliner: false },
  { date: "2025-05-01", artist: "Baby Boyz Brass Band", isHeadliner: false },
  { date: "2025-05-01", artist: "Panorama Jazz Band", isHeadliner: false },
  { date: "2025-05-01", artist: "The Pfister Sisters", isHeadliner: false },
  { date: "2025-05-01", artist: "21st Century Brass Band", isHeadliner: false },
  { date: "2025-05-01", artist: "Young Fellaz Brass Band", isHeadliner: false },

  // ==================== MAY 2 ====================
  // Headliners
  { date: "2025-05-02", artist: "Eagles", isHeadliner: true },
  { date: "2025-05-02", artist: "Alabama Shakes", isHeadliner: true },
  { date: "2025-05-02", artist: "T-Pain", isHeadliner: true },
  { date: "2025-05-02", artist: "Dianne Reeves", isHeadliner: true },
  { date: "2025-05-02", artist: "Dumpstaphunk", isHeadliner: true },
  { date: "2025-05-02", artist: "Little Feat", isHeadliner: true },
  { date: "2025-05-02", artist: "The Soul Rebels", isHeadliner: true },
  { date: "2025-05-02", artist: "Anders Osborne", isHeadliner: true },
  { date: "2025-05-02", artist: "Big Freedia", isHeadliner: true },
  // Other acts
  { date: "2025-05-02", artist: "Sierra Hull", isHeadliner: false },
  { date: "2025-05-02", artist: "Larry McCray", isHeadliner: false },
  { date: "2025-05-02", artist: "The Gospel Soul of Irma Thomas", isHeadliner: false },
  { date: "2025-05-02", artist: "Corey Henry & The Treme Funktet", isHeadliner: false },
  { date: "2025-05-02", artist: "Leo Nocentelli of The Meters", isHeadliner: false },
  { date: "2025-05-02", artist: "C.J. Chenier & the Red Hot Louisiana Band", isHeadliner: false },
  { date: "2025-05-02", artist: "Leyla McCalla", isHeadliner: false },
  { date: "2025-05-02", artist: "Wayne Toups", isHeadliner: false },
  { date: "2025-05-02", artist: "Dee-1", isHeadliner: false },
  { date: "2025-05-02", artist: "Delfeayo Marsalis & The Uptown Jazz Orchestra", isHeadliner: false },
  { date: "2025-05-02", artist: "Eric Lindell", isHeadliner: false },
  { date: "2025-05-02", artist: "The Skatalites", isHeadliner: false },
  { date: "2025-05-02", artist: "Nathan & The Zydeco Cha Chas", isHeadliner: false },
  { date: "2025-05-02", artist: "J & The Causeways", isHeadliner: false },
  { date: "2025-05-02", artist: "Creole String Beans", isHeadliner: false },
  { date: "2025-05-02", artist: "Honey Island Swamp Band", isHeadliner: false },
  { date: "2025-05-02", artist: "Jeremy Davenport", isHeadliner: false },
  { date: "2025-05-02", artist: "Ghalia Volt", isHeadliner: false },
  { date: "2025-05-02", artist: "Lilli Lewis", isHeadliner: false },
  { date: "2025-05-02", artist: "Mia Borders", isHeadliner: false },
  { date: "2025-05-02", artist: "Midnite Disturbers", isHeadliner: false },
  { date: "2025-05-02", artist: "Leroy Jones & New Orleans' Finest", isHeadliner: false },
  { date: "2025-05-02", artist: "John Mooney & Bluesiana", isHeadliner: false },
  { date: "2025-05-02", artist: "Susan Cowsill", isHeadliner: false },
  { date: "2025-05-02", artist: "Savoy Family Cajun Band", isHeadliner: false },
  { date: "2025-05-02", artist: "Bill Summers & Jazalsa", isHeadliner: false },
  { date: "2025-05-02", artist: "Storyville Stompers Brass Band", isHeadliner: false },
  { date: "2025-05-02", artist: "The Revelers", isHeadliner: false },
  { date: "2025-05-02", artist: "The Paulin Brothers Brass Band", isHeadliner: false },
  { date: "2025-05-02", artist: "Tidal Wave Brass Band", isHeadliner: false },

  // ==================== MAY 3 ====================
  // Headliners
  { date: "2025-05-03", artist: "Teddy Swims", isHeadliner: true },
  { date: "2025-05-03", artist: "Earth, Wind & Fire", isHeadliner: true },
  { date: "2025-05-03", artist: "Tedeschi Trucks Band", isHeadliner: true },
  { date: "2025-05-03", artist: "Herbie Hancock", isHeadliner: true },
  { date: "2025-05-03", artist: "Trombone Shorty & Orleans Avenue", isHeadliner: true },
  { date: "2025-05-03", artist: "Mavis Staples", isHeadliner: true },
  { date: "2025-05-03", artist: "Galactic featuring Jelly Joseph", isHeadliner: true },
  { date: "2025-05-03", artist: "The Radiators", isHeadliner: true },
  { date: "2025-05-03", artist: "Rebirth Brass Band", isHeadliner: true },
  // Other acts
  { date: "2025-05-03", artist: "Jackie Venson", isHeadliner: false },
  { date: "2025-05-03", artist: "Big Sam's Funky Nation", isHeadliner: false },
  { date: "2025-05-03", artist: "George Porter Jr & Runnin' Pardners", isHeadliner: false },
  { date: "2025-05-03", artist: "Jon Cleary & the Absolute Monster Gentlemen", isHeadliner: false },
  { date: "2025-05-03", artist: "Steve Earle featuring Anders Osborne", isHeadliner: false },
  { date: "2025-05-03", artist: "Lila Iké", isHeadliner: false },
  { date: "2025-05-03", artist: "Kermit Ruffins' Tribute to Louis Armstrong", isHeadliner: false },
  { date: "2025-05-03", artist: "Deacon John", isHeadliner: false },
  { date: "2025-05-03", artist: "Shamarr Allen", isHeadliner: false },
  { date: "2025-05-03", artist: "RAM from Haiti", isHeadliner: false },
  { date: "2025-05-03", artist: "Lil' Nathan & the Zydeco Big Timers", isHeadliner: false },
  { date: "2025-05-03", artist: "Big Chief Bo Dollis Jr. & The Wild Magnolias", isHeadliner: false },
  { date: "2025-05-03", artist: "James Andrews & the Crescent City Allstars", isHeadliner: false },
  { date: "2025-05-03", artist: "Jason Marsalis", isHeadliner: false },
  { date: "2025-05-03", artist: "Andrew Duhon", isHeadliner: false },
  { date: "2025-05-03", artist: "Davell Crawford presents Fabulous Friends Forever", isHeadliner: false },
  { date: "2025-05-03", artist: "Trumpet Mafia's Tribute to Miles Davis", isHeadliner: false },
  { date: "2025-05-03", artist: "Doreen's Jazz New Orleans", isHeadliner: false },
  { date: "2025-05-03", artist: "Steve Riley & the Mamou Playboys", isHeadliner: false },
  { date: "2025-05-03", artist: "Banu Gibson", isHeadliner: false },
  { date: "2025-05-03", artist: "The Allen Toussaint Jazzity Project", isHeadliner: false },
  { date: "2025-05-03", artist: "Original Pinettes Brass Band", isHeadliner: false },
  { date: "2025-05-03", artist: "Robin Barnes & the FiyaBirds", isHeadliner: false },
  { date: "2025-05-03", artist: "Roddie Romero & the Hub City All-Stars", isHeadliner: false },
  { date: "2025-05-03", artist: "Pocket Aces Brass Band", isHeadliner: false },
  { date: "2025-05-03", artist: "Real Untouchables Brass Band", isHeadliner: false },
  { date: "2025-05-03", artist: "New Generation Brass Band", isHeadliner: false },
];

async function main() {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.error("No VITE_CONVEX_URL found in .env.local");
    process.exit(1);
  }

  console.log(`Connecting to Convex at ${convexUrl}...`);
  const client = new ConvexHttpClient(convexUrl);

  // Check if Jazz Fest venue already exists
  const { venues } = await client.query(api.events.getCalendarData);
  let jazzFestVenue = venues.find((v: any) => v.isJazzFest);

  if (!jazzFestVenue) {
    console.log("Creating Jazz Fest venue...");
    const jazzFestId = await client.mutation(api.events.addVenue, {
      name: "Jazz Fest",
      isJazzFest: true,
      order: -1, // Put at top
    });
    jazzFestVenue = { _id: jazzFestId };
    console.log("Created Jazz Fest venue");
  } else {
    // Delete existing Jazz Fest events to avoid duplicates
    console.log("Jazz Fest venue exists, will add new events...");
  }

  // Count stats
  const headliners = JAZZ_FEST_ARTISTS.filter((a) => a.isHeadliner);
  const others = JAZZ_FEST_ARTISTS.filter((a) => !a.isHeadliner);

  console.log(`\nAdding ${JAZZ_FEST_ARTISTS.length} Jazz Fest artists...`);
  console.log(`  - ${headliners.length} headliners`);
  console.log(`  - ${others.length} other acts`);

  for (const artist of JAZZ_FEST_ARTISTS) {
    await client.mutation(api.events.addEvent, {
      venueId: jazzFestVenue._id,
      date: artist.date,
      artist: artist.artist,
      isHeadliner: artist.isHeadliner,
      approved: true,
    });
  }

  console.log("\nDone! Jazz Fest artists added.");

  // Summary by date
  const byDate: Record<string, { headliners: number; others: number }> = {};
  for (const a of JAZZ_FEST_ARTISTS) {
    if (!byDate[a.date]) byDate[a.date] = { headliners: 0, others: 0 };
    if (a.isHeadliner) byDate[a.date].headliners++;
    else byDate[a.date].others++;
  }

  console.log("\nArtists by date:");
  for (const [date, counts] of Object.entries(byDate).sort()) {
    console.log(`  ${date}: ${counts.headliners} headliners, ${counts.others} others`);
  }
}

main().catch(console.error);
