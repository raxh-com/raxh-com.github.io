// Datos académicos UDP, copiados de RTR_WORKSPACE/1_CV/Academic_Record_EN.html
const CAT = {
  math:{ label:'Mathematics & Sciences', color:'#5E8DB5' },
  comp:{ label:'Computing & Technology', color:'#4A9491' },
  econ:{ label:'Economics & Finance',    color:'#5E9E6A' },
  mgmt:{ label:'Management & Business',  color:'#B8864A' },
  engr:{ label:'Engineering',            color:'#A85E42' },
  lang:{ label:'Languages & General',    color:'#7A6AB8' },
  cape:{ label:'Internship & Capstone',  color:'#6A8E8A' },
};

// [code, English title, original Spanish title, SCT credits, category, description]
const C = {
'Credited on admission': [
  ['CIG1012','General English I','Inglés General I',5,'lang','Foundation English covering grammar, vocabulary and core communication skills. Credited through prior certification; entry point for all subsequent English modules in the programme.'],
],
'2020 · Semester 1': [
  ['CBM1000','Algebra and Geometry','Álgebra y Geometría',7,'math','Introduction to algebraic structures, vector spaces and Euclidean geometry. Covers sets, functions, matrices and analytic geometry — groundwork for all subsequent mathematics and engineering courses.'],
  ['CBM1001','Calculus I','Cálculo I',7,'math','Single-variable differential calculus: limits, continuity, derivatives and their applications to optimisation and curve sketching.'],
  ['CBQ1000','Chemistry','Química',6,'math','General chemistry covering atomic structure, chemical bonding, stoichiometry and reaction equilibria. Provides the physicochemical foundation for thermodynamics, materials and industrial processes.'],
  ['CIT1000','Programming','Programación',6,'comp','Introduction to programming logic using Python: algorithms, control structures, functions and basic data structures. Develops systematic problem-solving and computational thinking applied to engineering problems.'],
],
'2020 · Semester 2': [
  ['CBF1000','Physics: Mechanics','Mecánica',7,'math','Classical mechanics: kinematics and dynamics of particles and rigid bodies, Newton\'s laws, work, energy and momentum.'],
  ['CIT1010','Advanced Programming','Programación Avanzada',6,'comp','Object-oriented programming, data structures (lists, trees, graphs), sorting and search algorithms, and software design principles. Builds the computational skills applied later in data science and analytics.'],
  ['FIC1000','Communication for Engineering','Comunicación para la Ingeniería',5,'lang','Technical communication for engineers: academic writing, oral presentations, report structure and professional documentation.'],
],
'2021 · Semester 1': [
  ['CBM1002','Linear Algebra','Álgebra Lineal',6,'math','Systems of equations, matrix operations, determinants, vector spaces, linear transformations, eigenvalues and eigenvectors. Core tool for optimisation, data science and engineering modelling.'],
  ['CBM1003','Calculus II','Cálculo II',6,'math','Multivariable calculus: partial derivatives, gradients, multiple integrals and optimisation. Essential for thermodynamics, fluid mechanics and economic modelling.'],
  ['CII1001','Organisational Theory','Teoría Organizacional',6,'mgmt','Foundations of organisations: formal and informal structure, culture, motivation theories, leadership models and management approaches.'],
  ['CII2250','Statics','Estática',6,'math','Mechanics of rigid bodies at rest: force systems, moments, equilibrium conditions, trusses, frames and distributed loads.'],
  ['CII2501','Databases','Bases de Datos',6,'comp','Relational database design: entity-relationship modelling, normalisation, SQL queries, joins and transaction management. Applied to real-world data management scenarios including inventory and production systems.'],
],
'2021 · Semester 2': [
  ['CBE2000','Probability and Statistics','Probabilidades y Estadística',6,'math','Probability theory and descriptive statistics: random variables, common distributions, expected value, variance and introductory statistical inference.'],
  ['CBM1005','Differential Equations','Ecuaciones Diferenciales',6,'math','Ordinary differential equations: first and second-order equations, systems of ODEs, Laplace transforms and engineering applications for modelling dynamic systems.'],
  ['CBM1006','Calculus III','Cálculo III',6,'math','Vector calculus: line and surface integrals, Green\'s, Stokes\' and Divergence theorems. Applied to fluid dynamics, electromagnetism and three-dimensional system analysis.'],
  ['CII1000','Accounting and Cost Management','Contabilidad y Costos',6,'mgmt','Financial and cost accounting: balance sheets, income statements, cash flow analysis, cost allocation methods and break-even analysis.'],
],
'2022 · Semester 1': [
  ['CBF1001','Heat and Waves','Calor y Ondas',7,'math','Thermodynamic fundamentals, wave mechanics, optics and heat transfer phenomena. Bridges classical physics with engineering applications in thermal systems, acoustics and optical technologies.'],
  ['CII2002','Engineering Economics','Ingeniería Económica',6,'econ','Economic analysis of engineering investments: time value of money, cash flow modelling, NPV, IRR, payback period and depreciation.'],
  ['CII2100','Introduction to Economics','Introducción a la Economía',6,'econ','Macro and microeconomic fundamentals: supply and demand, market equilibria, GDP, monetary and fiscal policy, inflation and unemployment.'],
  ['CII2750','Optimisation','Optimización',6,'engr','Mathematical optimisation: linear programming, the simplex method, duality theory, integer programming and network flow models. Applied to resource allocation, scheduling and operations research problems.'],
  ['CII2751','Statistical Inference','Inferencia Estadística',6,'econ','Hypothesis testing, confidence intervals, ANOVA and simple linear regression. The statistical toolkit used in econometrics, quality control and data-driven management.'],
],
'2022 · Semester 2': [
  ['CBF1002','Electricity and Magnetism','Electricidad y Magnetismo',7,'math','Electrostatics, DC and AC circuits, magnetism, electromagnetic induction and Maxwell\'s equations. Underpins industrial automation, power systems and electronics.'],
  ['CIG1013','General English II','Inglés General II',5,'lang','Intermediate academic English: reading comprehension, essay writing, presentation skills and professional listening.'],
  ['CII2101','Microeconomics','Microeconomía',6,'econ','Consumer theory, production and cost functions, market competition models, game theory and welfare economics.'],
  ['CII2755','Stochastic Models','Modelos Estocásticos',6,'econ','Stochastic processes: Markov chains, Poisson processes, queuing theory and renewal processes. Applied to uncertain systems in operations management, finance and service design.'],
  ['IAE4113','Foundations of Economics','Fundamentos de Economía',5,'econ','Economics survey: growth theory, international trade, exchange rates, monetary systems and development economics.'],
],
'2023 · Semester 1': [
  ['CII2003','Finance','Finanzas',6,'econ','Corporate finance and capital markets: portfolio theory, CAPM, cost of capital, capital structure, dividend policy and firm valuation.'],
  ['CII2253','Production Management','Producción',6,'engr','Operations management: production planning, scheduling, inventory control, MRP, lean manufacturing and quality management.'],
  ['CII2504','Data Science','Data Science',6,'comp','End-to-end data science pipeline in Python: data wrangling (pandas), exploratory analysis, visualisation (matplotlib) and supervised machine learning basics, applied to real business and engineering datasets.'],
  ['CII2756','Econometrics','Econometría',6,'econ','Applied econometrics: OLS regression, hypothesis testing, multicollinearity, heteroscedasticity, time series models and panel data methods.'],
  ['FGD9066','Physical Conditioning (flexible schedule)','Acondicionamiento Físico (Horario Flexible)',5,'lang','Physical conditioning, exercise science and wellness methodology. Complementary elective.'],
  ['ICI5011','Professional Internship I','Práctica Profesional I',7,'cape','First professional internship: applied engineering work within a real organisation, with a formal internship report assessed by the faculty.'],
],
'2023 · Semester 2': [
  ['CII2004','Project Evaluation','Evaluación de Proyectos',6,'econ','Social and private cost-benefit analysis, risk assessment, sensitivity analysis and investment decision criteria. Framework for appraising infrastructure, energy and private business ventures.'],
  ['CII2102','Marketing','Marketing',6,'mgmt','Market research, consumer behaviour, segmentation, targeting, positioning, branding, pricing and digital channels.'],
  ['CII2254','Logistics','Logística',6,'mgmt','Supply chain and logistics management: procurement, warehouse operations, transport routing, inventory optimisation and demand forecasting.'],
  ['CII2401','Fluid Mechanics','Mecánica de Fluidos',6,'engr','Continuity and momentum equations, Bernoulli equation, viscous flow in pipes, boundary layers and hydraulic systems. Applied to industrial processes, water distribution and energy generation.'],
  ['CII2757','Simulation','Simulación',6,'engr','Discrete-event simulation: system modelling, random number generation, Monte Carlo methods and statistical output analysis, used to optimise complex manufacturing and service systems.'],
  ['PUB9324','Business Plan','Plan de Negocios',5,'mgmt','Business plan development: market opportunity analysis, competitive positioning, financial projections, funding strategy and pitch preparation.'],
],
'2024 · Semester 1': [
  ['CFG2343','Photography and Memory','Fotografía y Memoria',5,'lang','Photography as a medium of cultural memory, identity and social narrative. Humanities elective on visual storytelling and archival photography.'],
  ['CII2103','Strategic Management','Gestión Estratégica',6,'mgmt','Porter\'s Five Forces, Value Chain, Blue Ocean Strategy, Resource-Based View and dynamic capabilities, applied to competitive analysis of real firms and industries.'],
  ['CII2402','Thermodynamics','Termodinámica',6,'engr','Engineering thermodynamics: first and second laws, entropy, thermodynamic cycles (Carnot, Rankine, Brayton), refrigeration and energy system efficiency.'],
  ['CII3101','Leadership and Entrepreneurship','Liderazgo y Emprendimiento',6,'mgmt','Leadership styles, team dynamics, entrepreneurship, innovation management and design thinking.'],
  ['CII3615','Microeconometrics','Microeconometría',6,'econ','Advanced econometrics for micro-level data: instrumental variables, difference-in-differences, regression discontinuity and treatment effect estimation for causal inference and policy evaluation.'],
  ['CII3629','Data Mining','Data Mining',6,'comp','Pattern discovery in large datasets: clustering (k-means, hierarchical), classification (decision trees, random forests), association rules and dimensionality reduction.'],
],
'2024 · Semester 2': [
  ['CII2403','Energy Projects','Proyectos Energéticos',6,'engr','Energy project evaluation: renewable technologies (solar, wind, hydro), power market economics, regulatory frameworks, environmental impact and sustainability in the Chilean and Latin American context.'],
  ['CII3500','Business Game: Applied Engineering with World-Class ERP','Juego de Negocios: Aplicación Práctica de Ingeniería con ERP de Clase Mundial',6,'comp','Business simulation using SAP ERP: integrated management across finance, procurement, logistics, production and HR, developing practical fluency with enterprise resource planning systems.'],
  ['CII3628','Nanoscience and Nanotechnology in Industry','Nanociencia y Nanotecnología en la Industria',6,'comp','Nanoscale science and technology: quantum effects, nanomaterials, nanofabrication and emerging industrial applications in energy, medicine and advanced manufacturing.'],
  ['CII3708','Technological Innovation and Industry 4.0','Innovación Tecnológica e Industria 4.0',6,'comp','Industry 4.0 technologies: IoT, artificial intelligence, digital twins, cyber-physical systems and smart manufacturing, and how digital transformation reshapes industrial operations and business models.'],
  ['CII3709','Management in the Mining Industry','Gestión en la Industria Minera',6,'mgmt','Mining industry management: extraction operations, environmental and safety regulation, project economics, ESG frameworks and sustainability in Chile\'s copper and lithium sectors.'],
  ['CII3710','FinTech','FinTech',6,'econ','Financial technology: digital payments, blockchain, open banking APIs, algorithmic trading, robo-advisors and regulatory frameworks.'],
],
'2025 · Semester 1': [
  ['CIG1014','General English III','Inglés General III',5,'lang','Advanced English: academic writing, critical reading of research papers, professional presentation skills and business correspondence.'],
  ['CII3102','Industrial Engineering Workshop','Taller de Ingeniería Industrial',7,'engr','Integrative capstone workshop: real-world case studies applying systems thinking, lean methodologies and quantitative tools to complex organisational and engineering challenges.'],
  ['CII3611','Business Ethics','Ética Empresarial',6,'mgmt','Business ethics and corporate responsibility: stakeholder theory, sustainability, corporate governance and ethical decision-making, through case studies and structured debate.'],
],
'2025 · Semester 2': [
  ['ICI3333','Final Degree Examination','Examen de Título',30,'cape','Comprehensive oral and written examination covering all major areas of Industrial Civil Engineering, assessed by a faculty committee. Formal conclusion of the five-year professional degree.'],
  ['ICI5022','Professional Internship II','Práctica Profesional II',7,'cape','Second professional internship with greater responsibility and scope, leading real engineering projects within an organisation.'],
],
};
