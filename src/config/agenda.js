import Agenda from "agenda";

let agenda = null;

export const initializeAgenda = async () => {
  try {
    
    if (agenda) {
      return agenda;
    }

    agenda = new Agenda({
      db: {
        address: process.env.MONGO_URI,
        collection: "agendaJobs"
      },

      processEvery: "5 seconds",

      maxConcurrency: 10,
      defaultConcurrency: 5,

      defaultLockLifetime: 10 * 60 * 1000
    });

    await agenda.start();

    console.log("✅ Agenda started successfully");

    return agenda;

  } catch (error) {

    console.error("❌ Failed to initialize Agenda:", error);

    throw error; 
  }
};