import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";
import SubjectComingSoon from "./SubjectComingSoon";

// Chapter details, official resources, formula sheets and notes
const CHAPTER_DETAILS = {
  "ch-1": {
    title: "Number Systems",
    unit: "Unit I: Number Systems",
    description:
      "Number Systems is the foundation of Class 9 Mathematics. It introduces the classification of Real Numbers into rational and irrational numbers, representing them on the real number line, laws of exponents with positive real bases, and rationalising denominators for surds and radical expressions.",
    recommended: {
      title: "Number Systems Comprehensive Masterclass",
      duration: "45 mins · 5 lessons",
    },
    resources: [
      { type: "Video", title: "NCERT Class 9 Number Systems in 20 Minutes (Full Chapter)", url: "https://www.youtube.com/results?search_query=ncert+class+9+number+systems" },
      { type: "Article", title: "Real Numbers & Decimal Expansions: Terminating vs Non-Terminating", url: "https://www.youtube.com/results?search_query=class+9+irrational+numbers" },
      { type: "Formula", title: "Formula Sheet: Laws of Exponents & Radical Operations", url: "#" },
      { type: "Notes", title: "NCERT Revision Notes & Solved Exemplar Problems (PDF)", url: "#" },
      { type: "Video", title: "Rationalisation of Denominators with Conjugates Step-by-Step", url: "https://www.youtube.com/results?search_query=class+9+rationalisation+of+denominators" },
    ],
    commonMistake: "Watch out for negative powers in exponent laws: a^(-n) = 1/a^n, and remember that √a + √b ≠ √(a+b)!",
    quizId: "t1",
  },
  "ch-2": {
    title: "Polynomials",
    unit: "Unit II: Algebra",
    description:
      "Polynomials covers algebraic expressions in one variable, definition of degrees, coefficients, zeroes of a polynomial, Remainder Theorem, factorisation using the factor theorem and splitting the middle term, and applying algebraic identities.",
    recommended: {
      title: "Polynomials & Algebraic Identities Masterclass",
      duration: "50 mins · 6 lessons",
    },
    resources: [
      { type: "Video", title: "Class 9 Polynomials Concept Lecture & Factoring Guide", url: "https://www.youtube.com/results?search_query=ncert+class+9+polynomials" },
      { type: "Article", title: "Factorisation: Splitting the Middle Term & Factor Theorem", url: "https://www.youtube.com/results?search_query=class+9+splitting+the+middle+term" },
      { type: "Formula", title: "Formula Sheet: All 8 Algebraic Identities Quick Cheatsheet", url: "#" },
      { type: "Notes", title: "Polynomials Complete NCERT Summary & Notes", url: "#" },
      { type: "Video", title: "Zeroes of a Polynomial & Remainder Theorem Worked Examples", url: "https://www.youtube.com/results?search_query=class+9+remainder+theorem" },
    ],
    commonMistake: "A common error is confusing (x+y)² = x² + 2xy + y² with x² + y². Always include the 2xy middle term!",
    quizId: "t3",
  },
  "ch-3": {
    title: "Coordinate Geometry",
    unit: "Unit III: Coordinate Geometry",
    description:
      "Coordinate Geometry introduces the Cartesian plane formulated by René Descartes. Students learn to locate points using ordered pairs (x, y), understand the x-axis (abscissa), y-axis (ordinate), the origin (0, 0), and sign conventions of the 4 quadrants.",
    recommended: {
      title: "Cartesian Plane & Coordinates Fundamentals",
      duration: "35 mins · 3 lessons",
    },
    resources: [
      { type: "Video", title: "Cartesian System & Plotting Points Explained Visually", url: "https://www.youtube.com/results?search_query=ncert+class+9+coordinate+geometry" },
      { type: "Article", title: "Abscissa, Ordinate & Quadrant Sign Conventions", url: "#" },
      { type: "Formula", title: "Coordinate Axes & Sign Convention Reference Card", url: "#" },
      { type: "Notes", title: "Coordinate Geometry Quick Revision Notes", url: "#" },
    ],
    commonMistake: "Don't swap coordinates! In (x, y), x comes first (horizontal axis) and y second (vertical axis).",
    quizId: "t3",
  },
  "ch-4": {
    title: "Linear Equations in Two Variables",
    unit: "Unit II: Algebra",
    description:
      "Linear Equations in Two Variables focuses on equations of the form ax + by + c = 0 where a, b ≠ 0. It explains that a linear equation in two variables has infinitely many solutions, plotting straight-line graphs, and interpreting lines parallel to coordinate axes (x = a and y = b).",
    recommended: {
      title: "Linear Equations in 2 Variables: Graphing & Solutions",
      duration: "48 mins · 5 lessons",
    },
    resources: [
      { type: "Video", title: "Solving & Graphing Linear Equations in 2 Variables", url: "https://www.youtube.com/results?search_query=ncert+class+9+linear+equations" },
      { type: "Article", title: "Equations of Lines Parallel to Axes (x=k, y=k)", url: "#" },
      { type: "Formula", title: "Formula Sheet: Standard Form ax+by+c=0 & Solution Properties", url: "#" },
      { type: "Notes", title: "Translating Word Problems into Linear Equations (PDF)", url: "#" },
      { type: "Video", title: "Plotting Solutions on Cartesian Plane: Line Drawing Tutorial", url: "https://www.youtube.com/results?search_query=class+9+graph+of+linear+equations" },
    ],
    commonMistake: "Equations like y = 3 represent a horizontal line parallel to the x-axis, NOT the y-axis!",
    quizId: "t2",
  },
  "ch-5": {
    title: "Introduction to Euclid’s Geometry",
    unit: "Unit IV: Geometry",
    description:
      "Introduces Euclidean geometry, the historical foundations laid by Euclid, and deductive proofs. Covers Euclid's definitions of point, line, and surface, his 7 axioms, his 5 postulates, and the famous 5th parallel postulate.",
    recommended: {
      title: "Euclid's Axioms & 5 Postulates in Depth",
      duration: "30 mins · 3 lessons",
    },
    resources: [
      { type: "Video", title: "Introduction to Euclid's Geometry: Definitions & 5 Postulates", url: "https://www.youtube.com/results?search_query=ncert+class+9+euclid+geometry" },
      { type: "Article", title: "Summary of Euclid's 7 Axioms and 5 Postulates", url: "#" },
      { type: "Formula", title: "Euclidean Axioms & Playfair's Axiom Reference Sheet", url: "#" },
      { type: "Notes", title: "Euclidean Geometry Chapter Notes & Definitions", url: "#" },
    ],
    commonMistake: "Remember that Axioms apply to all mathematics, whereas Postulates are specific to geometry!",
    quizId: "t4",
  },
  "ch-6": {
    title: "Lines and Angles",
    unit: "Unit IV: Geometry",
    description:
      "Covers rays, collinear points, complementary and supplementary angles, Linear Pair Axiom, vertically opposite angles theorem, parallel lines cut by a transversal, and the angle sum property of a triangle.",
    recommended: {
      title: "Lines, Angles & Transversal Theorems Masterclass",
      duration: "55 mins · 6 lessons",
    },
    resources: [
      { type: "Video", title: "Lines & Angles: Parallel Lines, Transversals & Angle Sum", url: "https://www.youtube.com/results?search_query=ncert+class+9+lines+and+angles" },
      { type: "Article", title: "Linear Pair Axiom & Transversal Alternate Angle Theorems", url: "#" },
      { type: "Formula", title: "Formula Sheet: Angle Properties & Parallel Line Theorems", url: "#" },
      { type: "Notes", title: "Angle Sum Property of Triangle & Exterior Angle Theorem", url: "#" },
    ],
    commonMistake: "Consecutive interior angles on the same side of a transversal are supplementary (sum = 180°), NOT equal!",
    quizId: "t4",
  },
  "ch-7": {
    title: "Triangles",
    unit: "Unit IV: Geometry",
    description:
      "Dedicated to the congruence of triangles: two figures having identical shape and size. Rigorously covers the 5 congruence criteria (SAS, ASA, AAS, SSS, and RHS), properties of isosceles triangles, and triangle inequalities.",
    recommended: {
      title: "Congruence of Triangles (SAS, ASA, AAS, SSS, RHS)",
      duration: "60 mins · 7 lessons",
    },
    resources: [
      { type: "Video", title: "Triangle Congruence Rules & Step-by-Step Proofs", url: "https://www.youtube.com/results?search_query=ncert+class+9+triangles+congruence" },
      { type: "Article", title: "Class 9 Triangles Complete Theorems & Proof Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: 5 Congruence Criteria & Isosceles Theorems", url: "#" },
      { type: "Notes", title: "Geometry Proof Writing: 10 Must-Solve NCERT Problems", url: "#" },
    ],
    commonMistake: "There is NO 'AAA' or 'SSA' congruence criterion! Only SAS, ASA, AAS, SSS, and RHS prove congruence.",
    quizId: "t4",
  },
  "ch-8": {
    title: "Quadrilaterals",
    unit: "Unit IV: Geometry",
    description:
      "Studies four-sided polygons: angle sum property (360°), properties of parallelograms, special quadrilaterals (rectangles, rhombuses, squares), and the crucial Mid-point Theorem and its converse.",
    recommended: {
      title: "Properties of Parallelograms & Mid-Point Theorem",
      duration: "50 mins · 5 lessons",
    },
    resources: [
      { type: "Video", title: "Quadrilaterals & Mid-Point Theorem Made Easy", url: "https://www.youtube.com/results?search_query=ncert+class+9+quadrilaterals" },
      { type: "Article", title: "Parallelogram Theorems & Mid-Point Theorem Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: Quadrilateral Properties & Hierarchy Chart", url: "#" },
      { type: "Notes", title: "Step-by-Step Proofs of Mid-Point Theorem & Converse", url: "#" },
    ],
    commonMistake: "A rhombus has perpendicular diagonals, but its angles are not necessarily 90° (unless it's a square)!",
    quizId: "t4",
  },
  "ch-9": {
    title: "Areas of Parallelograms and Triangles",
    unit: "Unit IV: Geometry",
    description:
      "Explores the relationship between figures on the same base and between the same parallel lines: parallelograms on the same base and between same parallels have equal area; triangles on the same base and between same parallels have equal area.",
    recommended: {
      title: "Area Theorems for Parallelograms & Triangles",
      duration: "40 mins · 4 lessons",
    },
    resources: [
      { type: "Video", title: "Areas on Same Base & Parallels Theorems", url: "https://www.youtube.com/results?search_query=ncert+class+9+areas+of+parallelograms+and+triangles" },
      { type: "Article", title: "Area Relations & Theorem Proof Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: Area Formulas & Parallel Lines Properties", url: "#" },
      { type: "Notes", title: "Triangle Median Divides Triangle into Two Equal Areas", url: "#" },
    ],
    commonMistake: "Two figures with equal area are NOT necessarily congruent! Equal area means same measure, not same shape.",
    quizId: "t4",
  },
  "ch-10": {
    title: "Circles",
    unit: "Unit IV: Geometry",
    description:
      "Investigates circles, chords, arcs, and subtended angles. Proves that equal chords subtend equal angles at the centre, perpendicular from centre to chord bisects it, angle subtended by arc at centre is double that at circumference, and cyclic quadrilaterals.",
    recommended: {
      title: "Circles: Chord Properties & Cyclic Quadrilaterals",
      duration: "55 mins · 6 lessons",
    },
    resources: [
      { type: "Video", title: "Circle Theorems, Angle in Semicircle & Cyclic Quads", url: "https://www.youtube.com/results?search_query=ncert+class+9+circles" },
      { type: "Article", title: "Class 9 Circles Theorems & Proof Guide", url: "#" },
      { type: "Formula", title: "Formula Sheet: Circle Theorems Summary & Diagrammatic Sheet", url: "#" },
      { type: "Notes", title: "Opposite Angles of Cyclic Quadrilateral Sum to 180° Proof", url: "#" },
    ],
    commonMistake: "The angle in a semicircle is ALWAYS 90°! Keep this theorem in mind for right-angle triangle proofs in circles.",
    quizId: "t4",
  },
  "ch-11": {
    title: "Constructions",
    unit: "Unit IV: Geometry",
    description:
      "Focuses on geometric compass-and-straightedge constructions: bisecting an angle, drawing perpendicular bisectors of line segments, constructing angles of 60°, 30°, 90°, 45°, and constructing triangles given base, sum/difference of sides, and base angles.",
    recommended: {
      title: "Geometric Constructions Step-by-Step",
      duration: "35 mins · 3 lessons",
    },
    resources: [
      { type: "Video", title: "Compass Constructions: Bisectors & Triangle Problems", url: "https://www.youtube.com/results?search_query=ncert+class+9+constructions" },
      { type: "Article", title: "Constructions Steps & Justifications Notes", url: "#" },
      { type: "Formula", title: "Steps of Construction Quick Reference Sheet", url: "#" },
      { type: "Notes", title: "Constructing Triangles with Perimeter & Base Angles", url: "#" },
    ],
    commonMistake: "Always write down the steps of construction and keep arc markings crisp and clearly visible!",
    quizId: "t4",
  },
  "ch-12": {
    title: "Heron’s Formula",
    unit: "Unit V: Mensuration",
    description:
      "Derives and applies Heron's formula for finding the area of a triangle when all three side lengths a, b, c are known: Area = √[s(s-a)(s-b)(s-c)] where s = (a+b+c)/2 is the semi-perimeter. Also applies to quadrilaterals.",
    recommended: {
      title: "Heron's Formula & Quadrilateral Area Applications",
      duration: "40 mins · 4 lessons",
    },
    resources: [
      { type: "Video", title: "Heron's Formula: Derivation, Semi-Perimeter & Applications", url: "https://www.youtube.com/results?search_query=ncert+class+9+heron+formula" }
,
      { type: "Article", title: "Heron's Formula Solved Problems & Step-by-step Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: Heron's Formula s = (a+b+c)/2 & Area Calculation", url: "#" },
      { type: "Notes", title: "Partitioning Quadrilaterals to Apply Heron's Formula", url: "#" },
    ],
    commonMistake: "Ensure you calculate semi-perimeter s correctly: s = (a+b+c)/2, NOT (a+b+c)/3!",
    quizId: "t5",
  },
  "ch-13": {
    title: "Surface Areas and Volumes",
    unit: "Unit V: Mensuration",
    description:
      "Comprehensive 3D mensuration covering surface areas and volumes of 6 solid shapes: cuboid, cube, right circular cylinder, right circular cone, sphere, and hemisphere. Derives curved surface areas (CSA), total surface areas (TSA), and volumes.",
    recommended: {
      title: "3D Mensuration: Surface Areas & Volumes of All Solids",
      duration: "65 mins · 8 lessons",
    },
    resources: [
      { type: "Video", title: "Surface Areas and Volumes Formulas & NCERT Solutions", url: "https://www.youtube.com/results?search_query=ncert+class+9+surface+areas+and+volumes" },
      { type: "Article", title: "3D Solids Complete Formulas & Unit Conversion Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: CSA, TSA & Volume Master Chart (All Solids)", url: "#" },
      { type: "Notes", title: "Cone Slant Height l = √(r² + h²) and Sphere Formulas", url: "#" },
    ],
    commonMistake: "Watch out for units! Always convert cm and m to the same unit before calculating area or volume.",
    quizId: "t5",
  },
  "ch-14": {
    title: "Statistics",
    unit: "Unit VI: Statistics & Probability",
    description:
      "Introduces descriptive statistics: collecting primary and secondary data, frequency distributions (ungrouped and grouped), graphical representations (bar graphs, histograms with varying base widths, frequency polygons), and measures of central tendency (mean, median, mode).",
    recommended: {
      title: "Statistics: Histograms, Polygons & Central Tendency",
      duration: "45 mins · 5 lessons",
    },
    resources: [
      { type: "Video", title: "Class 9 Statistics: Frequency Distribution & Graphs", url: "https://www.youtube.com/results?search_query=ncert+class+9+statistics" },
      { type: "Article", title: "Histograms, Frequency Polygons & Mean Median Mode Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: Mean, Median & Mode Formulas for Ungrouped Data", url: "#" },
      { type: "Notes", title: "Adjusted Frequency for Histograms with Unequal Class Intervals", url: "#" },
    ],
    commonMistake: "Before finding the median, ALWAYS sort the data in ascending order first!",
    quizId: "t5",
  },
  "ch-15": {
    title: "Probability",
    unit: "Unit VI: Statistics & Probability",
    description:
      "Introduces experimental and empirical probability: calculating probability P(E) = (number of trials where event happened) / (total number of trials). Explores coin tosses, dice throws, and real-life statistical probabilities where 0 ≤ P(E) ≤ 1.",
    recommended: {
      title: "Experimental Probability & Real-Life Trials",
      duration: "35 mins · 3 lessons",
    },
    resources: [
      { type: "Video", title: "Probability Concept, Empirical Formula & NCERT Questions", url: "https://www.youtube.com/results?search_query=ncert+class+9+probability" },
      { type: "Article", title: "Probability Rules, Trial Calculations & Summary Notes", url: "#" },
      { type: "Formula", title: "Formula Sheet: Empirical Probability P(E) = Outcomes / Total", url: "#" },
      { type: "Notes", title: "Complementary Events: P(E) + P(not E) = 1 Cheatsheet", url: "#" },
    ],
    commonMistake: "Probability is always between 0 and 1 (inclusive). It can NEVER be negative or greater than 1!",
    quizId: "t5",
  },
};

const CLASS_9_MATH_ROADMAP_CHAPTERS = [
  {
    id: "ch-1",
    chapterNumber: 1,
    title: "Number Systems",
    unit: "Unit I: Number Systems",
    unitId: "unit-1",
    mastery: 84,
    status: "completed",
    badge: "Secure",
    recommended: false,
    quizId: "t1",
    side: "right",
    subtopics: [
      { id: "1.1", title: "Real Numbers & Decimal Expansions", status: "completed", mastery: 90 },
      { id: "1.2", title: "Representing Real Numbers on Number Line", status: "completed", mastery: 85 },
      { id: "1.3", title: "Operations on Real Numbers", status: "completed", mastery: 80 },
      { id: "1.4", title: "Rationalisation of Denominators", status: "completed", mastery: 85 },
      { id: "1.5", title: "Laws of Exponents for Real Numbers", status: "completed", mastery: 80 },
    ],
  },
  {
    id: "ch-2",
    chapterNumber: 2,
    title: "Polynomials",
    unit: "Unit II: Algebra",
    unitId: "unit-2",
    mastery: 62,
    status: "completed",
    badge: "Proficient",
    recommended: false,
    quizId: "t3",
    side: "left",
    subtopics: [
      { id: "2.1", title: "Polynomials in One Variable", status: "completed", mastery: 75 },
      { id: "2.2", title: "Zeroes of a Polynomial", status: "completed", mastery: 70 },
      { id: "2.3", title: "Remainder Theorem", status: "completed", mastery: 65 },
      { id: "2.4", title: "Factorisation of Polynomials", status: "completed", mastery: 60 },
      { id: "2.5", title: "Factor Theorem", status: "completed", mastery: 55 },
      { id: "2.6", title: "Algebraic Identities", status: "in_progress", mastery: 50 },
    ],
  },
  {
    id: "ch-3",
    chapterNumber: 3,
    title: "Coordinate Geometry",
    unit: "Unit III: Coordinate Geometry",
    unitId: "unit-3",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t3",
    side: "right",
    subtopics: [
      { id: "3.1", title: "Cartesian Plane & Coordinate Axes", status: "not_started", mastery: 0 },
      { id: "3.2", title: "Origin, Quadrants & Signs", status: "not_started", mastery: 0 },
      { id: "3.3", title: "Plotting Points on Graph", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-4",
    chapterNumber: 4,
    title: "Linear Equations in Two Variables",
    unit: "Unit II: Algebra",
    unitId: "unit-2",
    mastery: 47,
    status: "in_progress",
    badge: "Developing",
    recommended: true,
    quizId: "t2",
    side: "left",
    subtopics: [
      { id: "4.1", title: "Standard Form ax + by + c = 0", status: "completed", mastery: 65 },
      { id: "4.2", title: "Solutions of a Linear Equation", status: "in_progress", mastery: 45 },
      { id: "4.3", title: "Graph of Linear Equations in 2 Variables", status: "in_progress", mastery: 40 },
      { id: "4.4", title: "Equations Parallel to x-axis & y-axis", status: "not_started", mastery: 0 },
      { id: "4.5", title: "Word Problems & Practical Modelling", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-5",
    chapterNumber: 5,
    title: "Introduction to Euclid’s Geometry",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "right",
    subtopics: [
      { id: "5.1", title: "Euclid's Definitions, Axioms & Postulates", status: "not_started", mastery: 0 },
      { id: "5.2", title: "Five Postulates of Euclid", status: "not_started", mastery: 0 },
      { id: "5.3", title: "Equivalent Versions of Fifth Postulate", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-6",
    chapterNumber: 6,
    title: "Lines and Angles",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 48,
    status: "in_progress",
    badge: "Developing",
    recommended: false,
    quizId: "t4",
    side: "left",
    subtopics: [
      { id: "6.1", title: "Basic Terms, Rays & Angles", status: "completed", mastery: 70 },
      { id: "6.2", title: "Linear Pair Axiom & Vertically Opposite", status: "in_progress", mastery: 50 },
      { id: "6.3", title: "Parallel Lines & Transversal Properties", status: "in_progress", mastery: 45 },
      { id: "6.4", title: "Alternate & Consecutive Interior Angles", status: "not_started", mastery: 0 },
      { id: "6.5", title: "Lines Parallel to the Same Line", status: "not_started", mastery: 0 },
      { id: "6.6", title: "Angle Sum Property of a Triangle", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-7",
    chapterNumber: 7,
    title: "Triangles",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "right",
    subtopics: [
      { id: "7.1", title: "Congruence of Triangles Concept", status: "not_started", mastery: 0 },
      { id: "7.2", title: "Criteria: SAS and ASA Congruence", status: "not_started", mastery: 0 },
      { id: "7.3", title: "Criteria: AAS, SSS and RHS Rules", status: "not_started", mastery: 0 },
      { id: "7.4", title: "Isosceles Triangle Theorems", status: "not_started", mastery: 0 },
      { id: "7.5", title: "Inequalities in a Triangle", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-8",
    chapterNumber: 8,
    title: "Quadrilaterals",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "left",
    subtopics: [
      { id: "8.1", title: "Angle Sum Property of Quadrilaterals", status: "not_started", mastery: 0 },
      { id: "8.2", title: "Properties of Parallelograms", status: "not_started", mastery: 0 },
      { id: "8.3", title: "Conditions for a Parallelogram", status: "not_started", mastery: 0 },
      { id: "8.4", title: "The Mid-Point Theorem & Converse", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-9",
    chapterNumber: 9,
    title: "Areas of Parallelograms and Triangles",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "right",
    subtopics: [
      { id: "9.1", title: "Figures on Same Base & Between Parallels", status: "not_started", mastery: 0 },
      { id: "9.2", title: "Parallelograms on Same Base & Parallels", status: "not_started", mastery: 0 },
      { id: "9.3", title: "Triangles on Same Base & Parallels", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-10",
    chapterNumber: 10,
    title: "Circles",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "left",
    subtopics: [
      { id: "10.1", title: "Circles & Related Terminology", status: "not_started", mastery: 0 },
      { id: "10.2", title: "Angle Subtended by a Chord", status: "not_started", mastery: 0 },
      { id: "10.3", title: "Perpendicular from Centre to a Chord", status: "not_started", mastery: 0 },
      { id: "10.4", title: "Equal Chords & Distances from Centre", status: "not_started", mastery: 0 },
      { id: "10.5", title: "Angle Subtended by an Arc", status: "not_started", mastery: 0 },
      { id: "10.6", title: "Cyclic Quadrilaterals & Theorems", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-11",
    chapterNumber: 11,
    title: "Constructions",
    unit: "Unit IV: Geometry",
    unitId: "unit-4",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t4",
    side: "right",
    subtopics: [
      { id: "11.1", title: "Bisectors of Angles & Line Segments", status: "not_started", mastery: 0 },
      { id: "11.2", title: "Constructing Angles of 60°, 90°, 45°", status: "not_started", mastery: 0 },
      { id: "11.3", title: "Constructions of Triangles with Base & Sum/Diff", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-12",
    chapterNumber: 12,
    title: "Heron’s Formula",
    unit: "Unit V: Mensuration",
    unitId: "unit-5",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t5",
    side: "left",
    subtopics: [
      { id: "12.1", title: "Area of Triangle using Heron's Formula", status: "not_started", mastery: 0 },
      { id: "12.2", title: "Semi-perimeter s = (a+b+c)/2 Applications", status: "not_started", mastery: 0 },
      { id: "12.3", title: "Finding Quadrilateral Areas with Heron's", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-13",
    chapterNumber: 13,
    title: "Surface Areas and Volumes",
    unit: "Unit V: Mensuration",
    unitId: "unit-5",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t5",
    side: "right",
    subtopics: [
      { id: "13.1", title: "Surface Area of Cuboid & Cube", status: "not_started", mastery: 0 },
      { id: "13.2", title: "Surface Area of Right Circular Cylinder", status: "not_started", mastery: 0 },
      { id: "13.3", title: "Surface Area of Right Circular Cone", status: "not_started", mastery: 0 },
      { id: "13.4", title: "Surface Area of Sphere & Hemisphere", status: "not_started", mastery: 0 },
      { id: "13.5", title: "Volumes of Cuboid, Cube & Cylinder", status: "not_started", mastery: 0 },
      { id: "13.6", title: "Volumes of Cone, Sphere & Hemisphere", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-14",
    chapterNumber: 14,
    title: "Statistics",
    unit: "Unit VI: Statistics & Probability",
    unitId: "unit-6",
    mastery: 15,
    status: "in_progress",
    badge: "Needs practice",
    recommended: false,
    quizId: "t5",
    side: "left",
    subtopics: [
      { id: "14.1", title: "Collection & Grouped Frequency Distribution", status: "in_progress", mastery: 30 },
      { id: "14.2", title: "Graphical Representation: Histograms", status: "not_started", mastery: 0 },
      { id: "14.3", title: "Frequency Polygons & Interpretation", status: "not_started", mastery: 0 },
      { id: "14.4", title: "Measures of Central Tendency (Mean, Median, Mode)", status: "not_started", mastery: 0 },
    ],
  },
  {
    id: "ch-15",
    chapterNumber: 15,
    title: "Probability",
    unit: "Unit VI: Statistics & Probability",
    unitId: "unit-6",
    mastery: 0,
    status: "not_started",
    badge: null,
    recommended: false,
    quizId: "t5",
    side: "right",
    subtopics: [
      { id: "15.1", title: "Empirical / Experimental Probability Concept", status: "not_started", mastery: 0 },
      { id: "15.2", title: "Probability of Events: P(E) = Outcomes / Total", status: "not_started", mastery: 0 },
      { id: "15.3", title: "Experimental Trials, Dice & Coin Analysis", status: "not_started", mastery: 0 },
    ],
  },
];

const NCERT_UNITS = [
  { id: "all", label: "All Units", count: 15 },
  { id: "unit-1", label: "Unit I: Number Systems", count: 1 },
  { id: "unit-2", label: "Unit II: Algebra", count: 2 },
  { id: "unit-3", label: "Unit III: Coordinate Geometry", count: 1 },
  { id: "unit-4", label: "Unit IV: Geometry", count: 7 },
  { id: "unit-5", label: "Unit V: Mensuration", count: 2 },
  { id: "unit-6", label: "Unit VI: Statistics & Probability", count: 2 },
];

export default function SubjectChapters() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState("roadmap"); // "roadmap" (default) or "grid"
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [bookmarked, setBookmarked] = useState(true);
  const [showInfoAccordion, setShowInfoAccordion] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Slide-over Drawer / Sidebar state
  const [activeDrawer, setActiveDrawer] = useState(null); // { type: 'chapter' | 'subtopic', data, chapter }
  const [sidebarTab, setSidebarTab] = useState("resources"); // "resources" | "ai_tutor"
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([]);

  // Local statuses tracking
  const [itemStatuses, setItemStatuses] = useState({
    "ch-1": "completed",
    "ch-2": "completed",
    "ch-4": "in_progress",
    "ch-6": "in_progress",
    "ch-14": "in_progress",
    "1.1": "completed",
    "1.2": "completed",
    "1.3": "completed",
    "1.4": "completed",
    "1.5": "completed",
    "2.1": "completed",
    "2.2": "completed",
    "2.3": "completed",
    "2.4": "completed",
    "2.5": "completed",
    "2.6": "in_progress",
    "4.1": "completed",
    "4.2": "in_progress",
    "4.3": "in_progress",
    "6.1": "completed",
    "6.2": "in_progress",
    "6.3": "in_progress",
    "14.1": "in_progress",
  });

  const isMath = !subjectId || subjectId === "math";

  if (!isMath) {
    return <SubjectComingSoon subjectId={subjectId} />;
  }

  function openDrawer(item) {
    setActiveDrawer(item);
    setSidebarTab("resources");
    setAiQuestion("");
    setAiChatHistory([]);
  }

  function closeDrawer() {
    setActiveDrawer(null);
  }

  function handleStatusUpdate(newStatus) {
    if (!activeDrawer) return;
    const itemId = activeDrawer.data.id;
    setItemStatuses((prev) => ({
      ...prev,
      [itemId]: newStatus,
    }));
  }

  function handleAskAi(customPrompt) {
    const q = customPrompt || aiQuestion;
    if (!q.trim()) return;

    const topicTitle =
      activeDrawer.type === "chapter"
        ? activeDrawer.data.title
        : activeDrawer.data.title;

    const responseText = `Regarding **${topicTitle}**: Key concept to remember is the underlying definition and sign rules. In Class 9 CBSE, examiners frequently test standard proofs and sign reversals. Make sure to write the formula step before substituting numerical values!`;

    setAiChatHistory((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: responseText },
    ]);
    setAiQuestion("");
  }

  // Filter chapters if unit selected
  const chaptersToRender = CLASS_9_MATH_ROADMAP_CHAPTERS.filter((ch) => {
    const matchesUnit = selectedUnit === "all" || ch.unitId === selectedUnit;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ch.title.toLowerCase().includes(q) ||
      ch.unit.toLowerCase().includes(q) ||
      ch.subtopics.some((s) => s.title.toLowerCase().includes(q));
    return matchesUnit && matchesSearch;
  });

  // Calculate drawer payload
  const currentDrawerPayload = (() => {
    if (!activeDrawer) return null;
    if (activeDrawer.type === "chapter") {
      const ch = activeDrawer.data;
      const details = CHAPTER_DETAILS[ch.id] || {
        title: ch.title,
        unit: ch.unit,
        description: `Comprehensive study guide and practice resources for Chapter ${ch.chapterNumber}: ${ch.title}.`,
        recommended: { title: `${ch.title} Masterclass`, duration: "40 mins · 4 lessons" },
        resources: [
          { type: "Video", title: `${ch.title} Complete NCERT Walkthrough`, url: "#" },
          { type: "Article", title: `${ch.title} NCERT Summary & Notes`, url: "#" },
          { type: "Formula", title: "Class 9 Formula Sheet Reference Card", url: "#" },
          { type: "Notes", title: "Common Misconceptions & Traps", url: "#" },
        ],
        quizId: ch.quizId || "t2",
      };
      return {
        ...details,
        id: ch.id,
        status: itemStatuses[ch.id] || ch.status,
      };
    } else {
      const sub = activeDrawer.data;
      const parentCh = activeDrawer.chapter;
      return {
        id: sub.id,
        title: sub.title,
        unit: `${parentCh.title} · ${parentCh.unit}`,
        description: `This subtopic covers ${sub.title} in Class 9 ${parentCh.title}. Master the core definitions, theorem conditions, and problem-solving steps required for CBSE board exams.`,
        recommended: {
          title: `${sub.title} Video Lesson & Step-by-Step Examples`,
          duration: "15 mins · 1 targeted lesson",
        },
        resources: [
          { type: "Video", title: `Visual Explanation: ${sub.title}`, url: `https://www.youtube.com/results?search_query=class+9+${encodeURIComponent(sub.title)}` },
          { type: "Article", title: `NCERT Notes & Formula Reference for ${sub.title}`, url: "#" },
          { type: "Formula", title: `Key Formulas & Identity Sheet (${parentCh.title})`, url: "#" },
          { type: "Notes", title: "Step-by-step Worked Examples & Common Mistakes", url: "#" },
        ],
        status: itemStatuses[sub.id] || sub.status,
        quizId: parentCh.quizId || "t2",
        commonMistake: `Be careful when applying algebraic operations in ${sub.title}. Verify each step to prevent arithmetic errors.`,
      };
    }
  })();

  return (
    <PageShell>
      <div className="bg-[#fafbfd] min-h-screen pb-20 relative">
        {/* ============================================================== */}
        {/* 1. TOP HEADER & BREADCRUMBS (roadmap.sh style)                 */}
        {/* ============================================================== */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          {/* Top navigation row */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
            <button
              onClick={() => navigate("/roadmap")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>All Roadmaps</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-slate-500 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
                title="Bookmark Roadmap"
              >
                <svg className={`w-4 h-4 ${bookmarked ? "text-blue-600 fill-blue-600" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 font-bold text-xs text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Title Hero */}
          <div className="pt-6 pb-4">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight">
              Class 9 Mathematics
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
              Step by step guide to mastering CBSE &amp; NCERT Class 9 Mathematics in 2026. Click on any yellow chapter bar or subtopic card to open resources, video lectures, and formula sheets.
            </p>
          </div>

          {/* Subnav & View Switcher Tabs (Roadmap vs Grid) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-6 text-sm font-semibold">
              <button
                onClick={() => setActiveView("roadmap")}
                className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "roadmap"
                    ? "text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
                }`}
              >
                <span>🗺 Roadmap View</span>
              </button>
              <button
                onClick={() => setActiveView("grid")}
                className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "grid"
                    ? "text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
                }`}
              >
                <span>📋 Card Grid View</span>
              </button>
              <Link
                to="/quiz/t2?mode=practice"
                className="pb-2 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <span>🎯 Practice Quizzes</span>
              </Link>
            </div>

            {/* Unit Filter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {NCERT_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} ({u.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible Info Accordion */}
          <div className="rounded-2xl border border-slate-200/80 bg-white mb-8 shadow-2xs overflow-hidden">
            <button
              onClick={() => setShowInfoAccordion(!showInfoAccordion)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>What is the Class 9 Mathematics Roadmap?</span>
              </span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showInfoAccordion ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showInfoAccordion && (
              <div className="p-4 pt-1 border-t border-slate-100 text-xs text-slate-500 leading-relaxed bg-slate-50/50">
                This roadmap represents the official 15-chapter sequence of Class 9 CBSE Mathematics. Click any chapter or subtopic node to open the study sidebar with video lectures, formula sheets, NCERT notes, and practice quizzes.
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MAIN ROADMAP VIEW (ROADMAP.SH DIAGRAM WITH DOTTED LINES)     */}
        {/* ============================================================== */}
        {activeView === "roadmap" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
              {/* Left Floating Sidebar (Legend + Related Units) */}
              <div className="hidden lg:flex flex-col gap-5 sticky top-20">
                {/* Legend Box (from roadmap.sh reference image) */}
                <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_#0f172a]">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-3">
                    Roadmap Legend
                  </h4>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="font-medium">Personal Recommendation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="font-medium">Mastered / Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </span>
                      <span className="font-medium">In Progress / Learning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100 shrink-0" />
                      <span className="font-medium text-slate-500">Upcoming / Not Started</span>
                    </div>
                  </div>
                </div>

                {/* Beginner Action Button */}
                <Link
                  to="/quiz/t2?mode=practice"
                  className="rounded-2xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-xs p-3.5 text-center shadow-[3px_3px_0px_#0f172a] transition-all block cursor-pointer"
                >
                  Take Diagnostic Checkpoint →
                </Link>

                {/* Related NCERT Units Box */}
                <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_#0f172a]">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-2.5">
                    Class 9 Units
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {NCERT_UNITS.filter((u) => u.id !== "all").map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnit(selectedUnit === u.id ? "all" : u.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          selectedUnit === u.id
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{u.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({u.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advice Callout Card */}
                <div className="rounded-2xl border-2 border-slate-200/90 bg-white p-4 text-xs text-slate-600 shadow-2xs">
                  <p className="font-medium leading-relaxed">
                    <strong>Number Systems</strong> and <strong>Linear Equations</strong> form the backbone of Class 9 Math. Practice sign rules regularly before tackling Geometry proofs.
                  </p>
                  <button
                    onClick={() => openDrawer({ type: "chapter", data: CLASS_9_MATH_ROADMAP_CHAPTERS[3] })}
                    className="mt-3 block w-full text-center font-bold text-[11px] text-slate-800 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    View Linear Equations Resources
                  </button>
                </div>
              </div>

              {/* Main Center Canvas: Spine & Branching Chapter Nodes */}
              <div className="relative py-4 flex flex-col items-center">
                {/* Continuous Center Spine Line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-blue-500 z-0" />

                {/* Start Node: Class 9 Mathematics Root */}
                <div className="relative z-10 mb-8">
                  <div className="rounded-2xl border-2 border-slate-900 bg-white px-6 py-2.5 font-display font-extrabold text-sm sm:text-base text-slate-950 shadow-[3px_3px_0px_#0f172a] text-center">
                    Class 9 Mathematics
                  </div>
                </div>

                {/* Chapters 1 to 15 Flow */}
                {chaptersToRender.map((ch) => {
                  const isRight = ch.side === "right";
                  const subCount = ch.subtopics.length;
                  const itemHeight = 36;
                  const itemGap = 8;
                  const totalHeight = Math.max(80, subCount * itemHeight + (subCount - 1) * itemGap);
                  const centerY = totalHeight / 2;
                  const chStatus = itemStatuses[ch.id] || ch.status;

                  return (
                    <div key={ch.id} className="w-full relative z-10 my-4 sm:my-6">
                      {/* Milestone Checkpoint Box (Inserted between Algebra and Geometry) */}
                      {ch.chapterNumber === 5 && (
                        <div className="my-8 mx-auto max-w-md bg-white border-2 border-slate-300 rounded-2xl p-4 text-center shadow-xs relative z-20">
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                            At this point, you have completed <strong>Number Systems</strong> &amp; <strong>Algebra</strong>. You should be able to solve linear equations and coordinate graphs with high accuracy.
                          </p>
                          <Link
                            to="/quiz/t3?mode=practice"
                            className="mt-2.5 inline-block text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 px-4 py-1.5 rounded-xl transition-all"
                          >
                            Take Mid-Term Algebra Checkpoint
                          </Link>
                        </div>
                      )}

                      {/* Milestone Checkpoint Box (Inserted after Geometry completion) */}
                      {ch.chapterNumber === 12 && (
                        <div className="my-8 mx-auto max-w-md bg-white border-2 border-slate-300 rounded-2xl p-4 text-center shadow-xs relative z-20">
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                            Geometry Unit Complete: You have mastered Euclidean postulates, triangle congruence, quadrilaterals, and circle theorems.
                          </p>
                          <Link
                            to="/quiz/t4?mode=practice"
                            className="mt-2.5 inline-block text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 px-4 py-1.5 rounded-xl transition-all"
                          >
                            Take Geometry Proofs Practice
                          </Link>
                        </div>
                      )}

                      {/* Desktop 3-Column Branching Node (matches roadmap.sh) */}
                      <div className="hidden md:grid md:grid-cols-[1fr_240px_1fr] lg:grid-cols-[1fr_260px_1fr] items-center gap-0 w-full">
                        {/* LEFT COLUMN */}
                        <div className="flex justify-end pr-0">
                          {!isRight ? (
                            <div className="flex items-center justify-end w-full">
                              {/* Subtopic Stack (Left Side) */}
                              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                                {ch.subtopics.map((sub) => {
                                  const subStatus = itemStatuses[sub.id] || sub.status;
                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() => openDrawer({ type: "subtopic", data: sub, chapter: ch })}
                                      className="rounded-xl border border-slate-900 bg-[#fffbeb] hover:bg-[#fef3c7] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-between gap-2 text-left group"
                                      style={{ height: `${itemHeight}px` }}
                                      title="Click to open resources & notes sidebar"
                                    >
                                      <span className="truncate group-hover:text-blue-700">
                                        {sub.title}
                                      </span>
                                      {subStatus === "completed" ? (
                                        <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        </span>
                                      ) : ch.recommended ? (
                                        <span className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        </span>
                                      ) : subStatus === "in_progress" ? (
                                        <span className="w-4 h-4 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </span>
                                      ) : (
                                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* SVG Dotted Fanning Lines (Left Connector) */}
                              <svg
                                className="w-12 shrink-0 pointer-events-none"
                                style={{ height: `${totalHeight}px` }}
                                viewBox={`0 0 48 ${totalHeight}`}
                              >
                                {ch.subtopics.map((sub, sIdx) => {
                                  const targetY = sIdx * (itemHeight + itemGap) + itemHeight / 2;
                                  return (
                                    <path
                                      key={sub.id}
                                      d={`M 48,${centerY} C 24,${centerY} 24,${targetY} 0,${targetY}`}
                                      stroke="#3b82f6"
                                      strokeWidth="2"
                                      strokeDasharray="4 4"
                                      fill="none"
                                    />
                                  );
                                })}
                              </svg>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>

                        {/* CENTER COLUMN: Yellow Main Chapter Card */}
                        <div className="flex flex-col items-center justify-center relative px-2">
                          <div
                            onClick={() => openDrawer({ type: "chapter", data: ch })}
                            className={`w-full rounded-xl border-2 border-slate-900 p-3 sm:p-3.5 text-center font-display font-extrabold text-xs sm:text-sm text-slate-950 shadow-[3px_3px_0px_#0f172a] hover:-translate-y-0.5 transition-all cursor-pointer relative group ${
                              ch.recommended
                                ? "bg-[#ffd000] ring-2 ring-purple-500/40"
                                : "bg-[#ffd000] hover:bg-[#ffe033]"
                            }`}
                            title="Click to open chapter resources & notes sidebar"
                          >
                            {/* Chapter Number Label */}
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-800/80 mb-0.5">
                              Chapter {ch.chapterNumber}
                            </div>
                            <div className="font-extrabold leading-snug line-clamp-2">
                              {ch.title}
                            </div>

                            {/* Status tag */}
                            {ch.recommended && (
                              <span className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                                Recommended
                              </span>
                            )}
                            {chStatus === "completed" && (
                              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex justify-start pl-0">
                          {isRight ? (
                            <div className="flex items-center justify-start w-full">
                              {/* SVG Dotted Fanning Lines (Right Connector) */}
                              <svg
                                className="w-12 shrink-0 pointer-events-none"
                                style={{ height: `${totalHeight}px` }}
                                viewBox={`0 0 48 ${totalHeight}`}
                              >
                                {ch.subtopics.map((sub, sIdx) => {
                                  const targetY = sIdx * (itemHeight + itemGap) + itemHeight / 2;
                                  return (
                                    <path
                                      key={sub.id}
                                      d={`M 0,${centerY} C 24,${centerY} 24,${targetY} 48,${targetY}`}
                                      stroke="#3b82f6"
                                      strokeWidth="2"
                                      strokeDasharray="4 4"
                                      fill="none"
                                    />
                                  );
                                })}
                              </svg>

                              {/* Subtopic Stack (Right Side) */}
                              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                                {ch.subtopics.map((sub) => {
                                  const subStatus = itemStatuses[sub.id] || sub.status;
                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() => openDrawer({ type: "subtopic", data: sub, chapter: ch })}
                                      className="rounded-xl border border-slate-900 bg-[#fffbeb] hover:bg-[#fef3c7] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-between gap-2 text-left group"
                                      style={{ height: `${itemHeight}px` }}
                                      title="Click to open resources & notes sidebar"
                                    >
                                      <span className="truncate group-hover:text-blue-700">
                                        {sub.title}
                                      </span>
                                      {subStatus === "completed" ? (
                                        <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        </span>
                                      ) : ch.recommended ? (
                                        <span className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        </span>
                                      ) : subStatus === "in_progress" ? (
                                        <span className="w-4 h-4 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </span>
                                      ) : (
                                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>

                      {/* Mobile View: Vertical Timeline Layout */}
                      <div className="md:hidden flex flex-col items-center">
                        <div
                          onClick={() => openDrawer({ type: "chapter", data: ch })}
                          className="w-full max-w-sm rounded-xl border-2 border-slate-900 bg-[#ffd000] p-3 text-center font-display font-extrabold text-sm text-slate-950 shadow-[3px_3px_0px_#0f172a] mb-3 cursor-pointer"
                        >
                          <div className="text-[10px] font-mono uppercase text-slate-800">
                            Chapter {ch.chapterNumber} · {ch.unit}
                          </div>
                          <div>{ch.title}</div>
                        </div>

                        {/* Subtopics Mobile Stack */}
                        <div className="w-full max-w-sm pl-4 border-l-2 border-dashed border-blue-500 space-y-2">
                          {ch.subtopics.map((sub) => {
                            const subStatus = itemStatuses[sub.id] || sub.status;
                            return (
                              <div
                                key={sub.id}
                                onClick={() => openDrawer({ type: "subtopic", data: sub, chapter: ch })}
                                className="rounded-xl border border-slate-900 bg-[#fffbeb] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <span className="truncate">{sub.title}</span>
                                {subStatus === "completed" ? (
                                  <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 text-[10px]">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Final End Node */}
                <div className="relative z-10 mt-8 mb-4">
                  <div className="rounded-2xl border-2 border-slate-900 bg-emerald-400 px-6 py-3 font-display font-extrabold text-sm sm:text-base text-slate-950 shadow-[3px_3px_0px_#0f172a] text-center flex items-center gap-2">
                    <span>🎉 Class 9 Mathematics Mastered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. CARD GRID VIEW (Alternative View Mode)                      */}
        {/* ============================================================== */}
        {activeView === "grid" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {chaptersToRender.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => openDrawer({ type: "chapter", data: ch })}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between group cursor-pointer ${
                    ch.recommended
                      ? "border-blue-400 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        Ch {ch.chapterNumber}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 truncate">
                        {ch.unit}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {ch.title}
                    </h3>

                    {/* Subtopics bullet preview in card */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {ch.subtopics.length} Subtopics
                      </div>
                      <div className="space-y-1">
                        {ch.subtopics.slice(0, 3).map((sub) => (
                          <div key={sub.id} className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{sub.title}</span>
                          </div>
                        ))}
                        {ch.subtopics.length > 3 && (
                          <div className="text-[11px] font-medium text-blue-600">
                            +{ch.subtopics.length - 3} more subtopics
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {ch.mastery}% Mastery
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer({ type: "chapter", data: ch });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      View Resources →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SLIDE-OVER SIDEBAR DRAWER (Exact Match to Reference Images)  */}
        {/* ============================================================== */}
        {activeDrawer && currentDrawerPayload && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Dark backdrop blur */}
            <div
              onClick={closeDrawer}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Slide-over Right Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-lg sm:max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
                {/* Top Sticky Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                  {/* Left Tabs: Resources vs AI Tutor */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setSidebarTab("resources")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sidebarTab === "resources"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Resources</span>
                    </button>

                    <button
                      onClick={() => setSidebarTab("ai_tutor")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sidebarTab === "ai_tutor"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Tutor</span>
                    </button>
                  </div>

                  {/* Right Status Button Group & Close Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-slate-200 p-0.5 text-xs font-semibold text-slate-600 bg-slate-50">
                      <button
                        onClick={() => handleStatusUpdate("in_progress")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          currentDrawerPayload.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 font-bold"
                            : "hover:text-slate-900"
                        }`}
                        title="Mark as in progress"
                      >
                        <span>📖 Learning</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate("completed")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          currentDrawerPayload.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : "hover:text-slate-900"
                        }`}
                        title="Mark as completed"
                      >
                        <span>✓ Done</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate("not_started")}
                        className="px-2 py-1 rounded-lg hover:text-slate-900 transition-all cursor-pointer text-slate-400"
                        title="Reset status"
                      >
                        <span>✕ Skip</span>
                      </button>
                    </div>

                    <button
                      onClick={closeDrawer}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Drawer Body Content: Resources View */}
                {sidebarTab === "resources" && (
                  <div className="p-6 sm:p-7 space-y-6 flex-1 overflow-y-auto">
                    {/* Title & Description */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span>{currentDrawerPayload.unit}</span>
                        {currentDrawerPayload.status === "completed" && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full font-bold text-[10px] border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </div>
                      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-950 tracking-tight">
                        {currentDrawerPayload.title}
                      </h2>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed font-normal">
                        {currentDrawerPayload.description}
                      </p>
                    </div>

                    {/* Recommended Resource Box (Matching the amber box in image) */}
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4 sm:p-5 relative shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <span>★ Recommended</span>
                          <span>· Official resources by LearnLoop</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          NCERT CORE
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-2">
                        <div>
                          <h4 className="font-display font-bold text-sm sm:text-base text-slate-950">
                            {currentDrawerPayload.recommended.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>⏱ {currentDrawerPayload.recommended.duration}</span>
                            <span>· CBSE Aligned</span>
                          </p>
                        </div>

                        <Link
                          to={`/quiz/${currentDrawerPayload.quizId || "t2"}?mode=practice`}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 font-bold text-xs text-slate-950 shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Start ↗</span>
                        </Link>
                      </div>
                    </div>

                    {/* Free Resources List (Matching green heart section in image) */}
                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-3">
                        <span>💚 Free Resources</span>
                      </h3>
                      <div className="space-y-2">
                        {currentDrawerPayload.resources.map((res, i) => (
                          <a
                            key={i}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all group cursor-pointer bg-white"
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                              res.type === "Article"
                                ? "bg-amber-100 text-amber-800"
                                : res.type === "Video"
                                ? "bg-purple-100 text-purple-800"
                                : res.type === "Formula"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {res.type}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex-1 truncate">
                              {res.title}
                            </span>
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Formula Sheets & Diagnostic Practice */}
                    <div className="pt-2 border-t border-slate-100">
                      <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-3">
                        <span>⭐ Formula Sheets &amp; Diagnostic Quizzes</span>
                      </h3>
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 text-xs text-amber-900">
                          <span className="font-bold block mb-1">Common Exam Error Trap:</span>
                          {currentDrawerPayload.commonMistake}
                        </div>

                        <Link
                          to={`/quiz/${currentDrawerPayload.quizId || "t2"}?mode=practice`}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white">
                              Practice
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {currentDrawerPayload.title} Checkpoint Quiz
                              </div>
                              <div className="text-[11px] text-slate-500">
                                10 adaptive questions · Track your mastery gain
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            <span>Start Now</span>
                            <span>→</span>
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Body Content: AI Tutor View */}
                {sidebarTab === "ai_tutor" && (
                  <div className="p-6 sm:p-7 space-y-5 flex-1 overflow-y-auto flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                          ✨
                        </span>
                        <h3 className="font-display font-bold text-base text-slate-900">
                          AI Tutor · {currentDrawerPayload.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        Have a doubt in this concept, formula, or proof? Ask a question below or choose a common inquiry.
                      </p>

                      {/* Quick Prompt Suggestions */}
                      <div className="space-y-2 mb-4">
                        {[
                          `Explain the core formula for ${currentDrawerPayload.title}`,
                          `What are the most common exam traps in this topic?`,
                          `Give me a solved example step-by-step`,
                        ].map((promptText, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleAskAi(promptText)}
                            className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-xs font-medium text-slate-700 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{promptText}</span>
                            <span className="text-purple-600 text-xs ml-2">→</span>
                          </button>
                        ))}
                      </div>

                      {/* Chat History */}
                      {aiChatHistory.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          {aiChatHistory.map((msg, mIdx) => (
                            <div
                              key={mIdx}
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-slate-100 text-slate-900 font-semibold ml-6"
                                  : "bg-purple-50 border border-purple-200/80 text-purple-950 mr-4"
                              }`}
                            >
                              {msg.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ask Input */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="relative">
                        <input
                          type="text"
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                          placeholder={`Ask AI Tutor about ${currentDrawerPayload.title}...`}
                          className="w-full pl-4 pr-20 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                        <button
                          onClick={() => handleAskAi()}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">Esc</kbd> or click backdrop to close
                  </span>
                  <Link
                    to={`/quiz/${currentDrawerPayload.quizId || "t2"}?mode=practice`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Practice Questions</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
