import { Randomizer } from "./randomization";
import { PartyGenerator } from "./party-generator";

/**
 * Represents a random dining duration at our restaurant.
 */
export class DiningTime {
  public readonly lowerBound: number;
  public readonly upperBound: number;

  constructor(lowerBound: number, upperBound: number) {
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
  }

  public interpolate(randomizer: Randomizer): number {
    return this.lowerBound + randomizer.float() * (this.upperBound - this.lowerBound);
  }
}


/**
 * Represents a table at our restaurant and its current patrons.
*/
export class Table {
  public readonly id: number;
  public readonly capacity: number;

  private patrons: Person[];
  
  constructor(id: number, capacity: number, patrons: Person[] = []) {
    this.id = id;
    this.capacity = capacity;
    this.patrons = patrons;
  }

  public isOccupied(): boolean {
    return this.patrons.length > 0;
  }

  /**
   * Attempts to add a patron to the table and returns true if successful.
   * they are successfully added. Returns false if the table was full.
   */
  public addPatron(person: Person): boolean {
    if (this.patrons.length < this.capacity) {
      this.patrons.push(person);
      return true;
    }
    return false;
  }
  
  public arePatronsFinished(currentTime: number): boolean {
    return this.patrons.every(patron => currentTime >= patron.party.actualDiningTime);
  }

  /**
   * Removes all patrons from the table.
   */
  public clearTable(): void {
    this.patrons.forEach(patron => patron.leaveTable(this));
    this.patrons = [];
  }

  public to_string(): string {
    // return a string with width equal to capacity showing * for each patron
    return `[${this.patrons.map(_ => "*").join("").padEnd(this.capacity, " ")}]`;
  }
}


/**
 * Represents a person dining at our restaurant and their current table.
 */
export class Person {
  public readonly id: number;
  public readonly name: string;
  public readonly age: number;
  public readonly party!: Party; // ! assertion since we set it right after we make a Person

  private current_table: Table | undefined;

  constructor(id: number, name: string, age: number) {
    this.id = id;
    this.name = name;
    this.age = age;
  }

  public setParty(party: Party): void {
    (this as any).party = party;
  }

  /**
   * The person sits down at the specified table if possible. Throws an
   * exception if they were already sitting there or somewhere else, or
   * if the table is full.
   */
  public sitDown(table: Table) : void {
    if (this.current_table === table) { 
      throw new Error(`${this.name} is already sitting at table ${table.id}!`);
    }

    if (this.current_table) {
      throw new Error(`${this.name} is already sitting at another table!`);
    }

    if (!table.addPatron(this)) {
      throw new Error(`Table ${table.id} is full!`);
    }

    this.current_table = table;
  }

  /**
   * The person leaves the specified table.
   * Throws an exception if they weren't actually sitting there.
   */
  public leaveTable(table: Table) : void {
    if (this.current_table !== table) {
      throw new Error(`${this.name} wasn't sitting here!`);
    }
    else {
      this.current_table = undefined;
    }
  }

}



/**
 * Represents a party of people coming to the restaurant together.
 */
export class Party {
  private members: Person[];
  public readonly diningTime: DiningTime;
  public readonly actualDiningTime: number;

  constructor(members: Person[], diningTime: DiningTime, randomizer: Randomizer) {
    this.members = members;
    this.diningTime = diningTime;
    this.actualDiningTime = diningTime.interpolate(randomizer);
  }

  public getMembers(): Person[] {
    return this.members;
  }

  public partySize(): number {
    return this.members.length;
  }
}



/**
 * Represents the restaurant, its tables, and its waiting queue.
 * Manages the seating of new parties from the queue as tables are available.
 */
export class Restaurant {
  private tables: Table[];
  private waitingQueue: Party[];
  private currentTime: number;
  private totalServed: number = 0;

  constructor(tables: Table[]) {
    this.tables = tables;
    this.waitingQueue = [];
    this.currentTime = 0;
  }

  public addToWaitingQueue(party: Party): void {
    this.waitingQueue.push(party);
  }

  public getWaitingQueue(): Party[] {
    return this.waitingQueue;
  }

  public getWaitingPatronCount(): number {
    return this.waitingQueue.reduce((sum, party) => sum + party.partySize(), 0);
  }

  public nextAvailableTable(): Table | undefined {
    return this.tables.find(table => !table.isOccupied());
  }

  public seatParty(party: Party, table: Table): void {
    for (const person of party.getMembers()) {
      person.sitDown(table);
    }
  }

  public simulateStep(timeStep: number): void {
    this.currentTime += timeStep;

    // Check each table to see if patrons are done dining
    for (const table of this.tables) {
      if (table.arePatronsFinished(this.currentTime)) {
        table.clearTable();
      }
    }

    // Try to seat waiting parties
    while (this.waitingQueue.length > 0) {
      const nextParty = this.waitingQueue.shift()!; // ! assertion since we just checked length
      const table = this.nextAvailableTable();
      if (!table) {
        break; // No more available tables
      }

      try {
        this.seatParty(nextParty, table); // throws if we can't seat them
        this.totalServed += nextParty.partySize();
      }
      catch (e) {
        // If we can't seat them, put them back in the queue
        this.waitingQueue.unshift(nextParty);
        break;
      }
    }

  }

  public runSimulation(duration: number, timeStep: number): void {
    while (this.currentTime < duration) {
      this.simulateStep(timeStep);
    }
  }

  public printReport(): void {
    // print tables, total served, and queue length on one line
    const table_str = this.tables.map((table, i) => `${i+1}: ${table.to_string()}`).join(" ");
    console.log(`Tables: ${table_str} | Served: ${this.totalServed}, Queue: ${this.getWaitingPatronCount()}`);
  }

}



function main(): void {
  // Create a randomizer for the simulation
  const randomizer = Randomizer.create_from_seed("restaurant-sim");

  // Create tables with different capacities
  const tables = [
    new Table(1, 2),  // Table for 2
    new Table(2, 2),  // Table for 2
    new Table(3, 4),  // Table for 4
    new Table(4, 4),  // Table for 4
    new Table(5, 6),  // Table for 6
  ];

  // Create the restaurant
  const restaurant = new Restaurant(tables);

  console.log("=== Restaurant Simulation ===");
  console.log(`Tables: ${tables.length}`);
  console.log("");

  // Simulation parameters
  const duration = 240; // 4 hours until closing
  const timeStep = 5;

  const partyGenerator = new PartyGenerator(randomizer, {
    arrivalRate: 0.4,
    minPartySize: 1,
    maxPartySize: 6,
    minDiningTime: 30,
    maxDiningTime: 90
  });

  let partyCount = 0;

  for (let time = 0; time <= duration; time += timeStep) {
    // Generate new parties randomly throughout the simulation
    const newParty = partyGenerator.generateParty();
    if (newParty) {
      restaurant.addToWaitingQueue(newParty);
      partyCount++;
    }

    restaurant.simulateStep(timeStep);

    restaurant.printReport();
  }

}

main();
