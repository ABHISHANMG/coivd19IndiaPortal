const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const path = require("path");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initializeDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server working http://localhost/3000");
    });
  } catch (error) {
    console.log(`Error ${error.message}`);
    process.exit(1);
  }
};
initializeDatabase();

//API 1

//Authentication with Token

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payLoad) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
//API 2

const convertObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

app.get("/state/", authentication, async (request, response) => {
  const getQuery = `SELECT * FROM state;`;
  const stateQuery = await db.all(getQuery);
  response.send(stateQuery.map((eachState) => convertObject(eachState)));
});

//API 3

const convertObjectApiTwo = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const getQueryId = `SELECT * FROM state WHERE state_id = ${stateId}`;
  const queryState = await db.get(getQueryId);
  response.send(convertObjectApiTwo(queryState));
});

// API 4

app.post("/districts/", authentication, async (request, response) => {
  //const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateQuery = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths) VALUES 
    ('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  await db.run(updateQuery);
  response.send("District Successfully Added");
});

//API 5

const convertObjectApFive = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const districtQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
    const getQuery = await db.get(districtQuery);
    response.send(convertObjectApFive(getQuery));
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteQuery);
    response.send("District Removed");
  }
);

//API 7

app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateQuery = `UPDATE district SET 
    district_name = '${districtName}',state_id = ${stateId},cases = ${cases},cured = ${cured},active = ${active},deaths = ${deaths} 
    WHERE district_id = ${districtId};`;
    await db.run(updateQuery);
    response.send("District Details Updated");
  }
);

//API 8

app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const maxSCoreQuery = `SELECT 
    SUM(cases) AS totalCases, 
    SUM(cured) AS totalCured,
    SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId};`;
    const totalNumberQuery = await db.get(maxSCoreQuery);
    response.send(totalNumberQuery);
  }
);
module.exports = app;
