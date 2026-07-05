import express from 'express';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import SkillEvaluation from '../models/SkillEvaluation.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { withAuthenticatedUser } from '../utils/requestUser.js';
import { documentOwnedByUser, ownerFilter } from '../utils/ownership.js';
import { requireMongo } from '../middleware/mongoCheck.js';

const router = express.Router();

const shuffleArray = (items) => {
  const arr = Array.isArray(items) ? [...items] : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Comprehensive mock question generator for when API fails
const generateMockQuestions = (skillName, difficulty, questionCount) => {
  const mockQuestions = {
    'javascript': {
      beginner: [
        { question: 'What is a variable in JavaScript?', options: ['A named container for storing values', 'A type of function', 'A CSS property', 'An HTML element'], correctAnswer: 'A named container for storing values', practicalExample: 'let age = 25;\nlet name = "John";', explanation: 'Variables are used to store and manage data values in JavaScript programs.' },
        { question: 'Which keyword is used to declare a variable in JavaScript?', options: ['let, const, var', 'variable', 'declare', 'define'], correctAnswer: 'let, const, var', practicalExample: 'let x = 10;\nconst y = 20;\nvar z = 30;', explanation: 'let, const, and var are the three ways to declare variables in JavaScript.' },
        { question: 'What is the difference between let and const?', options: ['const cannot be reassigned, let can', 'let cannot be reassigned, const can', 'They are identical', 'const is faster'], correctAnswer: 'const cannot be reassigned, let can', practicalExample: 'let x = 10;\nx = 20; // OK\nconst y = 10;\ny = 20; // Error!', explanation: 'const creates a constant that cannot be reassigned, while let creates a variable that can be.' },
        { question: 'What is a function in JavaScript?', options: ['A reusable block of code', 'A type of variable', 'A CSS property', 'An HTML element'], correctAnswer: 'A reusable block of code', practicalExample: 'function greet(name) {\n  return "Hello, " + name;\n}', explanation: 'Functions are reusable blocks of code that perform specific tasks.' },
        { question: 'How do you call a function named myFunc?', options: ['myFunc()', 'call myFunc()', 'function myFunc()', 'run myFunc()'], correctAnswer: 'myFunc()', practicalExample: 'function myFunc() {\n  console.log("Hello");\n}\nmyFunc(); // Call the function', explanation: 'You call a function by writing its name followed by parentheses.' },
        { question: 'What is an array in JavaScript?', options: ['An ordered list of values', 'A type of variable', 'A function parameter', 'A CSS selector'], correctAnswer: 'An ordered list of values', practicalExample: 'let fruits = ["apple", "banana", "orange"];\nconsole.log(fruits[0]); // "apple"', explanation: 'Arrays store multiple values in a single variable and are accessed by index.' },
        { question: 'How do you access the first element of an array?', options: ['array[0]', 'array[1]', 'array.first', 'array.get(0)'], correctAnswer: 'array[0]', practicalExample: 'let colors = ["red", "green", "blue"];\nlet firstColor = colors[0]; // "red"', explanation: 'Arrays use zero-based indexing, so the first element is at index 0.' },
        { question: 'What does the length property of an array return?', options: ['The number of elements in the array', 'The last element', 'The type of array', 'The index of the last element'], correctAnswer: 'The number of elements in the array', practicalExample: 'let numbers = [1, 2, 3, 4, 5];\nconsole.log(numbers.length); // 5', explanation: 'The length property tells you how many elements are in an array.' },
        { question: 'What is an object in JavaScript?', options: ['A collection of key-value pairs', 'A type of array', 'A function', 'A CSS class'], correctAnswer: 'A collection of key-value pairs', practicalExample: 'let person = {\n  name: "John",\n  age: 30,\n  city: "New York"\n};', explanation: 'Objects store data as key-value pairs and are used to represent complex data.' },
        { question: 'How do you access a property of an object?', options: ['object.property or object["property"]', 'object->property', 'object:property', 'object->property()'], correctAnswer: 'object.property or object["property"]', practicalExample: 'let car = {brand: "Toyota", color: "red"};\nlet brand = car.brand; // "Toyota"\nlet color = car["color"]; // "red"', explanation: 'You can access object properties using dot notation or bracket notation.' },
        { question: 'What is the purpose of the "this" keyword in JavaScript?', options: ['To refer to the current object context', 'To refer to the previous variable', 'To create a new object', 'To refer to the global object'], correctAnswer: 'To refer to the current object context', practicalExample: 'let person = {\n  name: "John",\n  greet: function() {\n    return "Hello, " + this.name;\n  }\n};', explanation: '"this" refers to the object it belongs to and allows you to access its properties.' }
      ],
      intermediate: [
        { question: 'What is a closure in JavaScript?', options: ['A function that has access to variables from its outer scope', 'A type of loop', 'A way to close a program', 'A CSS property'], correctAnswer: 'A function that has access to variables from its outer scope', practicalExample: 'function outer() {\n  let count = 0;\n  function inner() {\n    count++;\n    console.log(count);\n  }\n  return inner;\n}', explanation: 'A closure is a function that retains access to variables from its enclosing scope.' },
        { question: 'What is the purpose of async/await?', options: ['To handle asynchronous operations more readably', 'To make code run faster', 'To create loops', 'To declare variables'], correctAnswer: 'To handle asynchronous operations more readably', practicalExample: 'async function fetchData() {\n  const response = await fetch("/api/data");\n  const data = await response.json();\n  return data;\n}', explanation: 'async/await is syntactic sugar that makes asynchronous code easier to read and write.' },
        { question: 'What is the spread operator (...) used for?', options: ['To expand iterables into individual elements', 'To create comments', 'To multiply numbers', 'To define functions'], correctAnswer: 'To expand iterables into individual elements', practicalExample: 'const arr1 = [1, 2, 3];\nconst arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]', explanation: 'The spread operator unpacks elements from arrays or objects.' },
        { question: 'What is destructuring in JavaScript?', options: ['A way to extract values from objects/arrays', 'A way to delete objects', 'A type of loop', 'A CSS property'], correctAnswer: 'A way to extract values from objects/arrays', practicalExample: 'const { name, age } = person;\nconst [first, second] = array;', explanation: 'Destructuring allows you to extract values from objects and arrays in a concise way.' },
        { question: 'What is a Promise in JavaScript?', options: ['An object representing eventual completion of async operation', 'A variable declaration', 'A type of function', 'A CSS property'], correctAnswer: 'An object representing eventual completion of async operation', practicalExample: 'const promise = new Promise((resolve, reject) => {\n  if (success) resolve(data);\n  else reject(error);\n});', explanation: 'A Promise is an object that represents the eventual result of an async operation.' },
        { question: 'What are callback functions?', options: ['Functions passed as arguments to other functions', 'Functions that return a value', 'A type of loop', 'Functions that run automatically'], correctAnswer: 'Functions passed as arguments to other functions', practicalExample: 'function greet(callback) {\n  callback("Hello!");\n}\ngreet(function(msg) {\n  console.log(msg);\n});', explanation: 'Callback functions are passed to other functions and executed later.' },
        { question: 'What is the .map() method?', options: ['Transforms array elements and returns a new array', 'Creates a map of locations', 'Finds elements in an array', 'Removes elements from an array'], correctAnswer: 'Transforms array elements and returns a new array', practicalExample: 'const numbers = [1, 2, 3, 4];\nconst doubled = numbers.map(x => x * 2);\n// [2, 4, 6, 8]', explanation: '.map() applies a function to each element and returns a new array.' },
        { question: 'What is the .filter() method?', options: ['Creates a new array with elements that pass a test', 'Removes all elements', 'Sorts an array', 'Merges arrays'], correctAnswer: 'Creates a new array with elements that pass a test', practicalExample: 'const numbers = [1, 2, 3, 4, 5, 6];\nconst evens = numbers.filter(x => x % 2 === 0);\n// [2, 4, 6]', explanation: '.filter() returns a new array with only elements that meet the condition.' },
        { question: 'What is template literal in JavaScript?', options: ['A string using backticks with ${} for expressions', 'A type of CSS template', 'A function template', 'A comment style'], correctAnswer: 'A string using backticks with ${} for expressions', practicalExample: 'const name = "John";\nconst age = 30;\nconst message = `${name} is ${age} years old`;', explanation: 'Template literals use backticks and allow embedded expressions with ${}.' },
        { question: 'What is the difference between null and undefined?', options: ['null is assigned, undefined means no value assigned', 'undefined is assigned, null means no value', 'They are identical', 'null is newer'], correctAnswer: 'null is assigned, undefined means no value assigned', practicalExample: 'let x = null; // explicitly set to no value\nlet y; // undefined - never assigned\nconsole.log(x === null); // true\nconsole.log(y === undefined); // true', explanation: 'null is explicitly set by the programmer, undefined means a value was never assigned.' }
      ],
      advanced: [
        { question: 'What is the event loop in JavaScript?', options: ['Mechanism for handling async code execution', 'A type of loop in coding', 'A way to create events', 'A CSS feature'], correctAnswer: 'Mechanism for handling async code execution', practicalExample: 'console.log(1);\nsetTimeout(() => console.log(2), 0);\nconsole.log(3);\n// Output: 1, 3, 2', explanation: 'The event loop manages how JavaScript executes synchronous and asynchronous code.' },
        { question: 'What is prototype-based inheritance?', options: ['Objects inherit from other objects via prototypes', 'A class-based inheritance system', 'A way to create classes', 'A type of loop'], correctAnswer: 'Objects inherit from other objects via prototypes', practicalExample: 'function Parent() {}\nParent.prototype.greet = function() { return "Hi"; };\nfunction Child() {}\nChild.prototype = Object.create(Parent.prototype);', explanation: 'JavaScript uses prototype chains for object inheritance rather than class-based inheritance.' },
        { question: 'What are higher-order functions?', options: ['Functions that operate on other functions', 'Functions with high performance', 'Special functions only', 'Functions with many parameters'], correctAnswer: 'Functions that operate on other functions', practicalExample: 'function higherOrder(fn) {\n  return function(x) {\n    return fn(x) * 2;\n  };\n}', explanation: 'Higher-order functions take functions as arguments or return functions as results.' },
        { question: 'What is the difference between var, let, and const regarding hoisting?', options: ['var is hoisted and initialized, let/const are hoisted but not initialized', 'They all behave the same', 'let is hoisted but var is not', 'const is hoisted but let is not'], correctAnswer: 'var is hoisted and initialized, let/const are hoisted but not initialized', practicalExample: 'console.log(x); // undefined (hoisted)\nvar x = 10;\nconsole.log(y); // ReferenceError\nlet y = 20;', explanation: 'var declarations are hoisted and initialized with undefined, while let and const are hoisted but not initialized.' },
        { question: 'What is the purpose of the Symbol primitive type?', options: ['To create unique identifiers', 'To define symbols in math', 'To create object keys', 'To define strings'], correctAnswer: 'To create unique identifiers', practicalExample: 'const id = Symbol("id");\nconst obj = {};\nobj[id] = "unique value";\nconsole.log(obj[id]); // "unique value"', explanation: 'Symbols are unique values used to create unique object property keys.' },
        { question: 'What is a WeakMap in JavaScript?', options: ['A map that holds weak references to keys', 'A type of array', 'A normal map', 'A special function'], correctAnswer: 'A map that holds weak references to keys', practicalExample: 'const weakMap = new WeakMap();\nconst obj = {};\nweakMap.set(obj, "value");\n// obj can be garbage collected', explanation: 'WeakMap allows garbage collection of its keys and is useful for private data.' },
        { question: 'What is the Temporal Dead Zone (TDZ) in JavaScript?', options: ['Period where let/const variables cannot be accessed before declaration', 'A time zone in JavaScript', 'A type of error', 'A debugging zone'], correctAnswer: 'Period where let/const variables cannot be accessed before declaration', practicalExample: 'console.log(x); // ReferenceError: Cannot access x before initialization\nlet x = 5;', explanation: 'The TDZ is the period from the start of a block until the variable declaration is reached.' },
        { question: 'What is Reflect API in JavaScript?', options: ['API for intercepting and customizing operations on objects', 'A fishing technique', 'A CSS feature', 'A debugging tool'], correctAnswer: 'API for intercepting and customizing operations on objects', practicalExample: 'const obj = {name: "John"};\nReflect.get(obj, "name"); // "John"\nReflect.set(obj, "age", 30);', explanation: 'Reflect provides methods to perform object operations in a standardized way.' },
        { question: 'What are Generators in JavaScript?', options: ['Functions that can be paused and resumed', 'Functions that generate data', 'A type of loop', 'A performance feature'], correctAnswer: 'Functions that can be paused and resumed', practicalExample: 'function* generator() {\n  yield 1;\n  yield 2;\n  yield 3;\n}\nconst gen = generator();\ngen.next(); // {value: 1, done: false}', explanation: 'Generators are functions that use the yield keyword and can pause/resume execution.' },
        { question: 'What is memoization in JavaScript?', options: ['Caching results of expensive function calls', 'A type of memory', 'A debugging technique', 'A loop optimization'], correctAnswer: 'Caching results of expensive function calls', practicalExample: 'function memoize(fn) {\n  const cache = {};\n  return (x) => {\n    if (x in cache) return cache[x];\n    return cache[x] = fn(x);\n  };\n}', explanation: 'Memoization improves performance by caching previous results to avoid recalculation.' }
      ]
    },
    'python': {
      beginner: [
        { question: 'What does print() do in Python?', options: ['Displays output to the console', 'Prints to a physical printer', 'Stores data', 'Creates a function'], correctAnswer: 'Displays output to the console', practicalExample: 'print("Hello, World!")\nprint(2 + 3)', explanation: 'print() is a built-in function that outputs data to the console.' },
        { question: 'How do you comment in Python?', options: ['Using #', 'Using //', 'Using /* */', 'Using --'], correctAnswer: 'Using #', practicalExample: '# This is a comment\nprint("Hello")  # Inline comment', explanation: 'Single-line comments in Python start with the # symbol.' },
        { question: 'What is a list in Python?', options: ['An ordered collection of items', 'A mathematical operation', 'A type of variable', 'A function'], correctAnswer: 'An ordered collection of items', practicalExample: 'my_list = [1, 2, 3, "apple"]\nprint(my_list[0])  # 1', explanation: 'Lists are ordered, mutable collections that can hold different data types.' },
        { question: 'What is the correct way to create a dictionary?', options: ['my_dict = {"key": "value"}', 'my_dict = ["key": "value"]', 'my_dict = ("key": "value")', 'my_dict = <"key": "value">'], correctAnswer: 'my_dict = {"key": "value"}', practicalExample: 'person = {"name": "John", "age": 30}\nprint(person["name"])  # John', explanation: 'Dictionaries are created using curly braces with key-value pairs.' },
        { question: 'How do you create a function in Python?', options: ['def function_name():', 'function function_name():', 'func function_name():', 'fn function_name():'], correctAnswer: 'def function_name():', practicalExample: 'def greet(name):\n  return f"Hello, {name}!"', explanation: 'Functions in Python are defined using the def keyword.' },
        { question: 'What is a tuple in Python?', options: ['An immutable ordered collection', 'A type of list', 'A function parameter', 'A loop structure'], correctAnswer: 'An immutable ordered collection', practicalExample: 'my_tuple = (1, 2, 3, "apple")\nprint(my_tuple[0])  # 1\nmy_tuple[0] = 5  # Error!', explanation: 'Tuples are similar to lists but cannot be modified after creation.' },
        { question: 'How do you create a set in Python?', options: ['my_set = {1, 2, 3}', 'my_set = [1, 2, 3]', 'my_set = (1, 2, 3)', 'my_set = Set(1, 2, 3)'], correctAnswer: 'my_set = {1, 2, 3}', practicalExample: 'numbers = {1, 2, 3, 3, 4}\nprint(numbers)  # {1, 2, 3, 4} - duplicates removed', explanation: 'Sets are unordered collections with no duplicates, created using curly braces.' },
        { question: 'What is a string in Python?', options: ['A sequence of characters', 'A type of number', 'A list of words', 'A function parameter'], correctAnswer: 'A sequence of characters', practicalExample: 'message = "Hello, World!"\nprint(message[0])  # "H"\nprint(len(message))  # 13', explanation: 'Strings are immutable sequences of characters and can be accessed by index.' },
        { question: 'How do you check the type of a variable?', options: ['type(variable)', 'typeof(variable)', 'getType(variable)', 'variable.type()'], correctAnswer: 'type(variable)', practicalExample: 'x = 5\nprint(type(x))  # <class "int">\ny = "hello"\nprint(type(y))  # <class "str">', explanation: 'The type() function returns the type of an object in Python.' },
        { question: 'What is the range() function used for?', options: ['To create a sequence of numbers', 'To find the range of a list', 'To create a random range', 'To measure distance'], correctAnswer: 'To create a sequence of numbers', practicalExample: 'for i in range(5):\n  print(i)  # prints 0, 1, 2, 3, 4\nlist(range(1, 5))  # [1, 2, 3, 4]', explanation: 'range() generates a sequence of numbers useful in loops and list creation.' }
      ],
      intermediate: [
        { question: 'What is list comprehension in Python?', options: ['A concise way to create lists', 'A comment about lists', 'A type of list', 'A function parameter'], correctAnswer: 'A concise way to create lists', practicalExample: 'squares = [x**2 for x in range(5)]\n# [0, 1, 4, 9, 16]', explanation: 'List comprehension provides a compact syntax for creating lists from existing lists.' },
        { question: 'What is the purpose of lambda functions?', options: ['To create small anonymous functions', 'To increase performance', 'To define classes', 'To create decorators'], correctAnswer: 'To create small anonymous functions', practicalExample: 'add = lambda x, y: x + y\nprint(add(2, 3))  # 5', explanation: 'Lambda functions are small anonymous functions defined with the lambda keyword.' },
        { question: 'What is the difference between append() and extend()?', options: ['append adds one item, extend adds multiple items', 'They are identical', 'extend adds one item, append adds multiple', 'extend is faster'], correctAnswer: 'append adds one item, extend adds multiple items', practicalExample: 'list1 = [1, 2]\nlist1.append([3, 4])  # [1, 2, [3, 4]]\nlist2 = [1, 2]\nlist2.extend([3, 4])  # [1, 2, 3, 4]', explanation: 'append() adds a single element while extend() adds multiple elements from an iterable.' },
        { question: 'What is a decorator in Python?', options: ['A function that modifies other functions', 'A type of variable', 'A way to comment code', 'A CSS property'], correctAnswer: 'A function that modifies other functions', practicalExample: '@decorator\ndef my_function():\n  pass', explanation: 'Decorators modify or enhance functions without permanently changing their source code.' },
        { question: 'What is the difference between == and is in Python?', options: ['== checks value, is checks identity', 'is checks value, == checks identity', 'They are identical', 'is is faster'], correctAnswer: '== checks value, is checks identity', practicalExample: 'a = [1, 2, 3]\nb = [1, 2, 3]\nprint(a == b)  # True\nprint(a is b)  # False', explanation: '== compares values while is compares object identity.' },
        { question: 'What is enumerate() used for?', options: ['To get index and value when iterating', 'To count items in a list', 'To sort a list', 'To find duplicates'], correctAnswer: 'To get index and value when iterating', practicalExample: 'fruits = ["apple", "banana", "orange"]\nfor i, fruit in enumerate(fruits):\n  print(f"{i}: {fruit}")\n# Output: 0: apple, 1: banana, 2: orange', explanation: 'enumerate() returns both the index and the value when looping through a sequence.' },
        { question: 'What is zip() used for in Python?', options: ['To combine multiple iterables', 'To compress files', 'To split a string', 'To create loops'], correctAnswer: 'To combine multiple iterables', practicalExample: 'names = ["Alice", "Bob", "Charlie"]\nages = [25, 30, 35]\nfor name, age in zip(names, ages):\n  print(f"{name} is {age}")', explanation: 'zip() pairs corresponding elements from multiple iterables together.'},
        { question: 'What is the purpose of *args in functions?', options: ['To accept variable number of positional arguments', 'To multiply values', 'To create loops', 'To define classes'], correctAnswer: 'To accept variable number of positional arguments', practicalExample: 'def sum_all(*args):\n  return sum(args)\nprint(sum_all(1, 2, 3, 4))  # 10', explanation: '*args allows a function to accept any number of positional arguments as a tuple.' },
        { question: 'What is the purpose of **kwargs in functions?', options: ['To accept variable keyword arguments', 'To multiply values', 'To create loops', 'To define classes'], correctAnswer: 'To accept variable keyword arguments', practicalExample: 'def print_info(**kwargs):\n  for key, value in kwargs.items():\n    print(f"{key}: {value}")\nprint_info(name="John", age=30)', explanation: '**kwargs allows a function to accept any number of keyword arguments as a dictionary.' },
        { question: 'What is a generator expression in Python?', options: ['A concise way to create generators', 'A type of list', 'A function generator', 'A loop structure'], correctAnswer: 'A concise way to create generators', practicalExample: 'squares = (x**2 for x in range(5))\nfor sq in squares:\n  print(sq)\n# Generates values on-the-fly instead of storing all in memory', explanation: 'Generator expressions are like list comprehensions but use parentheses and generate values lazily.' }
      ],
      advanced: [
        { question: 'What is a metaclass in Python?', options: ['A class whose instances are classes', 'A type of class', 'A base class', 'A decorator'], correctAnswer: 'A class whose instances are classes', practicalExample: 'class Meta(type):\n  pass\nclass MyClass(metaclass=Meta):\n  pass', explanation: 'Metaclasses are classes whose instances are classes themselves.' },
        { question: 'What is the Global Interpreter Lock (GIL)?', options: ['Mutex that protects access to Python objects', 'A security feature', 'A performance optimization', 'A function'], correctAnswer: 'Mutex that protects access to Python objects', practicalExample: '# The GIL ensures only one thread executes Python code at a time\nimport threading', explanation: 'The GIL prevents multiple threads from executing Python bytecode simultaneously.' },
        { question: 'What is a context manager in Python?', options: ['Manages resource allocation and cleanup', 'A type of variable', 'A function decorator', 'A loop control'], correctAnswer: 'Manages resource allocation and cleanup', practicalExample: 'with open("file.txt") as f:\n  data = f.read()\n# File automatically closes', explanation: 'Context managers use __enter__ and __exit__ methods to manage resources.' },
        { question: 'What is the difference between __new__ and __init__?', options: ['__new__ creates instance, __init__ initializes it', '__init__ creates, __new__ initializes', 'They are identical', '__new__ is deprecated'], correctAnswer: '__new__ creates instance, __init__ initializes it', practicalExample: 'class MyClass:\n  def __new__(cls):\n    instance = super().__new__(cls)\n    return instance\n  def __init__(self):\n    self.x = 10', explanation: '__new__ is responsible for creating a new instance while __init__ initializes it.' },
        { question: 'What is a descriptor in Python?', options: ['An object that defines attribute access behavior', 'A type of decorator', 'A class description', 'A documentation string'], correctAnswer: 'An object that defines attribute access behavior', practicalExample: 'class Descriptor:\n  def __get__(self, obj, objtype=None):\n    return "getting"\n  def __set__(self, obj, value):\n    pass', explanation: 'Descriptors control how attributes are accessed, set, or deleted.' },
        { question: 'What is a property decorator?', options: ['Allows you to define methods as attributes', 'Creates real estate', 'Decorates a function', 'Creates a class property'], correctAnswer: 'Allows you to define methods as attributes', practicalExample: 'class Circle:\n  def __init__(self, radius):\n    self._radius = radius\n  @property\n  def radius(self):\n    return self._radius', explanation: '@property decorator allows method calls to look like attribute access.' },
        { question: 'What is async/await in Python?', options: ['Syntax for writing asynchronous code', 'A type of loop', 'A debugging feature', 'A class method'], correctAnswer: 'Syntax for writing asynchronous code', practicalExample: 'async def fetch_data():\n  data = await get_from_api()\n  return data', explanation: 'async/await allows writing asynchronous code that looks synchronous.' },
        { question: 'What is a coroutine in Python?', options: ['A function that can be paused and resumed', 'A type of loop', 'A debugging tool', 'A class method'], correctAnswer: 'A function that can be paused and resumed', practicalExample: 'async def my_coroutine():\n  await asyncio.sleep(1)\n  print("Done")', explanation: 'Coroutines are defined with async def and can be paused with await.' },
        { question: 'What is __slots__ in Python?', options: ['Restricts attributes a class can have', 'Creates time slots', 'Defines methods', 'A memory optimization'], correctAnswer: 'Restricts attributes a class can have', practicalExample: 'class Person:\n  __slots__ = ["name", "age"]\n  def __init__(self, name, age):\n    self.name = name\n    self.age = age', explanation: '__slots__ saves memory by restricting which attributes instances can have.' },
        { question: 'What is the @classmethod decorator?', options: ['Binds a method to a class rather than instance', 'Decorates a class', 'Creates a method', 'A type of static method'], correctAnswer: 'Binds a method to a class rather than instance', practicalExample: 'class Person:\n  species = "Homo sapiens"\n  @classmethod\n  def get_species(cls):\n    return cls.species', explanation: '@classmethod allows methods to access and modify class state rather than instance state.' }
      ]
    },
    'dbms': {
      beginner: [
        { question: 'What is a Database Management System (DBMS)?', options: ['Software for managing databases', 'A type of server', 'A programming language', 'A network protocol'], correctAnswer: 'Software for managing databases', practicalExample: 'CREATE DATABASE my_database;\nUSE my_database;', explanation: 'A DBMS is software that provides tools for creating, managing, and accessing databases.' },
        { question: 'What is a primary key?', options: ['A unique identifier for records', 'The most important column', 'A type of join', 'A constraint on values'], correctAnswer: 'A unique identifier for records', practicalExample: 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(100)\n);', explanation: 'A primary key uniquely identifies each record in a table.' },
        { question: 'What is the difference between SQL and MySQL?', options: ['SQL is a language, MySQL is a database system', 'MySQL is a language, SQL is a system', 'They are the same', 'SQL is newer'], correctAnswer: 'SQL is a language, MySQL is a database system', practicalExample: 'SELECT * FROM users; -- This is SQL\n-- Executed in MySQL (or other DBMS)', explanation: 'SQL is the query language while MySQL is a relational database management system.' },
        { question: 'What is a table in a database?', options: ['A structured collection of data organized in rows and columns', 'A display of results', 'A type of query', 'A backup file'], correctAnswer: 'A structured collection of data organized in rows and columns', practicalExample: 'CREATE TABLE employees (\n  id INT,\n  name VARCHAR(50),\n  salary DECIMAL(10, 2)\n);', explanation: 'Tables are the fundamental storage structures in relational databases.' },
        { question: 'What does SELECT statement do?', options: ['Retrieves data from a database', 'Inserts new data', 'Deletes data', 'Updates existing data'], correctAnswer: 'Retrieves data from a database', practicalExample: 'SELECT name, email FROM users WHERE age > 18;', explanation: 'SELECT is used to query and retrieve data from one or more tables.' },
        { question: 'What is a schema in a database?', options: ['The structure and layout of data', 'A type of table', 'A backup method', 'A query result'], correctAnswer: 'The structure and layout of data', practicalExample: 'CREATE TABLE product (\n  id INT PRIMARY KEY,\n  name VARCHAR(100),\n  price DECIMAL(8,2)\n);', explanation: 'A schema defines the structure of tables and how data is organized.' },
        { question: 'What are the data types in SQL?', options: ['INT, VARCHAR, DATE, DECIMAL, etc.', 'Java, Python, C++', 'String, Array, Object', 'Server, Client, Database'], correctAnswer: 'INT, VARCHAR, DATE, DECIMAL, etc.', practicalExample: 'CREATE TABLE employees (\n  id INT,\n  name VARCHAR(50),\n  birth_date DATE,\n  salary DECIMAL(10,2)\n);', explanation: 'Data types define the kind of values that can be stored in a column.' },
        { question: 'What is a constraint in databases?', options: ['A rule applied to table/column to ensure data validity', 'A limit on file size', 'A type of key', 'A backup strategy'], correctAnswer: 'A rule applied to table/column to ensure data validity', practicalExample: 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(100) UNIQUE NOT NULL\n);', explanation: 'Constraints enforce data integrity by restricting what values can be stored.' },
        { question: 'What is the INSERT statement?', options: ['Adds new records to a table', 'Removes records', 'Modifies records', 'Displays records'], correctAnswer: 'Adds new records to a table', practicalExample: 'INSERT INTO users (name, email, age) VALUES ("John", "john@example.com", 30);', explanation: 'INSERT is used to add new rows of data to a table.' },
        { question: 'What is the UPDATE statement?', options: ['Modifies existing data in a table', 'Adds new data', 'Removes data', 'Displays data'], correctAnswer: 'Modifies existing data in a table', practicalExample: 'UPDATE users SET age = 31 WHERE name = "John";', explanation: 'UPDATE is used to change existing records in a table.' }
      ],
      intermediate: [
        { question: 'What is ACID in databases?', options: ['Atomicity, Consistency, Isolation, Durability', 'A chemical compound', 'A type of index', 'A backup method'], correctAnswer: 'Atomicity, Consistency, Isolation, Durability', practicalExample: '-- ACID ensures:\n-- Atomicity: All or nothing\n-- Consistency: Valid state\n-- Isolation: No conflicts\n-- Durability: Permanent', explanation: 'ACID properties ensure reliable database transactions.' },
        { question: 'What is a foreign key?', options: ['A key that references another table', 'A type of password', 'A temporary key', 'A backup key'], correctAnswer: 'A key that references another table', practicalExample: 'CREATE TABLE orders (\n  order_id INT PRIMARY KEY,\n  user_id INT,\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);', explanation: 'A foreign key creates a link between two tables.' },
        { question: 'What is an index in a database?', options: ['A data structure that improves query performance', 'A list of contents', 'A type of table', 'A backup copy'], correctAnswer: 'A data structure that improves query performance', practicalExample: 'CREATE INDEX idx_email ON users(email);\nSELECT * FROM users WHERE email = "john@example.com";', explanation: 'Indexes allow faster data retrieval by creating pointers to table data.' },
        { question: 'What is database normalization?', options: ['Process of organizing data to reduce redundancy', 'Making backups', 'Deleting old data', 'Compressing data'], correctAnswer: 'Process of organizing data to reduce redundancy', practicalExample: '-- Before normalization:\n-- users table with repeated city data\n-- After: Separate cities table with foreign key', explanation: 'Normalization reduces data duplication and improves database efficiency.' },
        { question: 'What is a JOIN in SQL?', options: ['Combines rows from multiple tables', 'Connects to a database', 'Merges two databases', 'Splits a table'], correctAnswer: 'Combines rows from multiple tables', practicalExample: 'SELECT users.name, orders.date\nFROM users\nJOIN orders ON users.id = orders.user_id;', explanation: 'JOINs combine data from multiple tables based on related columns.' },
        { question: 'What are the types of JOINs?', options: ['INNER, LEFT, RIGHT, FULL OUTER', 'Top, Bottom, Left, Right', 'Open, Close, Merge', 'Primary, Secondary, Tertiary'], correctAnswer: 'INNER, LEFT, RIGHT, FULL OUTER', practicalExample: 'SELECT * FROM table1 INNER JOIN table2 ON table1.id = table2.id;\nSELECT * FROM table1 LEFT JOIN table2 ON table1.id = table2.id;', explanation: 'Different JOIN types combine tables in different ways based on matching conditions.' },
        { question: 'What is GROUP BY used for?', options: ['To group rows with similar values', 'To sort data', 'To delete groups', 'To merge tables'], correctAnswer: 'To group rows with similar values', practicalExample: 'SELECT department, COUNT(*) as employee_count\nFROM employees\nGROUP BY department;', explanation: 'GROUP BY aggregates data based on one or more columns, useful with aggregate functions.' },
        { question: 'What are aggregate functions?', options: ['SUM, AVG, COUNT, MIN, MAX', 'ADD, SUBTRACT, MULTIPLY', 'INSERT, UPDATE, DELETE', 'CREATE, ALTER, DROP'], correctAnswer: 'SUM, AVG, COUNT, MIN, MAX', practicalExample: 'SELECT AVG(salary) FROM employees;\nSELECT COUNT(*) FROM users;\nSELECT MAX(age) FROM customers;', explanation: 'Aggregate functions perform calculations on sets of values and return a single value.' },
        { question: 'What is a VIEW in SQL?', options: ['A virtual table created from a query', 'A display window', 'A type of table', 'A backup view'], correctAnswer: 'A virtual table created from a query', practicalExample: 'CREATE VIEW high_earners AS\nSELECT name, salary FROM employees WHERE salary > 50000;', explanation: 'A VIEW is a saved query that appears as a table for easier access to frequently needed data.' },
        { question: 'What is the HAVING clause?', options: ['Filters groups of rows after GROUP BY', 'Filters rows before grouping', 'Sorts data', 'Joins tables'], correctAnswer: 'Filters groups of rows after GROUP BY', practicalExample: 'SELECT department, COUNT(*) as count\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 5;', explanation: 'HAVING filters the results of GROUP BY, similar to WHERE but for grouped data.' }
      ],
      advanced: [
        { question: 'What is horizontal vs vertical scaling in databases?', options: ['Horizontal adds more servers, vertical adds more power to existing server', 'Vertical adds servers, horizontal adds power', 'They are identical', 'Horizontal is faster'], correctAnswer: 'Horizontal adds more servers, vertical adds more power to existing server', practicalExample: '-- Horizontal: Database replication across multiple servers\n-- Vertical: Increasing CPU, RAM on single server', explanation: 'Horizontal scaling handles load by adding more machines while vertical scaling increases resources on a single machine.' },
        { question: 'What is MVCC (Multi-Version Concurrency Control)?', options: ['Allows multiple transactions to access same data simultaneously', 'A backup method', 'A compression technique', 'A type of index'], correctAnswer: 'Allows multiple transactions to access same data simultaneously', practicalExample: '-- Transaction A reads version 1\n-- Transaction B creates version 2\n-- No blocking occurs', explanation: 'MVCC maintains multiple versions of data to enable concurrent access without locking.' },
        { question: 'What is the difference between clustered and non-clustered indexes?', options: ['Clustered determines row order, non-clustered is separate', 'Non-clustered determines order, clustered is separate', 'They are the same', 'Clustered is faster'], correctAnswer: 'Clustered determines row order, non-clustered is separate', practicalExample: '-- Clustered index: One per table, determines physical order\nCREATE CLUSTERED INDEX idx ON users(id);\n-- Non-clustered index: Multiple per table\nCREATE NONCLUSTERED INDEX idx2 ON users(email);', explanation: 'Clustered indexes define the physical order of rows, while non-clustered indexes provide additional access patterns.' },
        { question: 'What is SQL injection and how to prevent it?', options: ['Attack using malicious SQL, prevent with prepared statements', 'A type of backup', 'A performance technique', 'A compression method'], correctAnswer: 'Attack using malicious SQL, prevent with prepared statements', practicalExample: '-- Vulnerable:\nSELECT * FROM users WHERE id = " + id;\n-- Safe:\nPREPARED STATEMENT vs "?"\nSELECT * FROM users WHERE id = ?', explanation: 'SQL injection occurs when user input is inserted into SQL queries unsafely. Prepared statements prevent this.' },
        { question: 'What is sharding in distributed databases?', options: ['Partitioning data across multiple nodes', 'Creating backups', 'Optimizing queries', 'Compressing data'], correctAnswer: 'Partitioning data across multiple nodes', practicalExample: '-- Shard 1: Users A-M\n-- Shard 2: Users N-Z\n-- Each node holds subset of data', explanation: 'Sharding distributes data across multiple servers to handle large datasets and scale horizontally.' },
        { question: 'What is the difference between replication and backup?', options: ['Replication is real-time copy, backup is periodic copy', 'They are the same', 'Backup is faster', 'Replication is for testing'], correctAnswer: 'Replication is real-time copy, backup is periodic copy', practicalExample: '-- Replication: Changes synced immediately\n-- Backup: Periodic copies made to storage', explanation: 'Replication keeps multiple copies synchronized for high availability, while backup is for disaster recovery.' },
        { question: 'What is transaction isolation levels?', options: ['Read Uncommitted, Read Committed, Repeatable Read, Serializable', 'Read, Write, Update, Delete', 'Primary, Secondary, Tertiary', 'Start, Middle, End'], correctAnswer: 'Read Uncommitted, Read Committed, Repeatable Read, Serializable', practicalExample: '-- Different levels protect against dirty reads, phantom reads, etc.\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;', explanation: 'Isolation levels control how transactions interact and protect data consistency.' },
        { question: 'What is denormalization in databases?', options: ['Intentionally adding redundancy for performance', 'Removing data', 'Creating indexes', 'Backing up data'], correctAnswer: 'Intentionally adding redundancy for performance', practicalExample: '-- Normalized: Separate tables for users and addresses\n-- Denormalized: Store address in users table for faster queries', explanation: 'Denormalization trades some data redundancy for improved query performance.' },
        { question: 'What is a stored procedure?', options: ['A set of SQL statements stored in the database', 'A type of backup', 'A performance tool', 'A query cache'], correctAnswer: 'A set of SQL statements stored in the database', practicalExample: 'CREATE PROCEDURE GetUserById @id INT AS\nBEGIN\n  SELECT * FROM users WHERE id = @id;\nEND;', explanation: 'Stored procedures encapsulate logic in the database, improving maintainability and performance.' },
        { question: 'What is CAP theorem?', options: ['Consistency, Availability, Partition tolerance - choose 2', 'Create, Access, Process', 'Copy, Archive, Preserve', 'Cache, Array, Pipeline'], correctAnswer: 'Consistency, Availability, Partition tolerance - choose 2', practicalExample: '-- Most systems choose either CA (relational) or AP (NoSQL)\n-- Cannot have all three simultaneously', explanation: 'CAP theorem states distributed systems can guarantee only 2 of 3 properties.' }
      ]
    }
  };

  // Default to generic questions if skill not found
  const skillQuestions = mockQuestions[skillName.toLowerCase()] || mockQuestions['javascript'];
  const difficultyQuestions = skillQuestions[difficulty] || skillQuestions['beginner'];

  // Generate number of questions needed
  const result = [];
  for (let i = 0; i < Math.min(questionCount, Math.max(difficultyQuestions.length, 10)); i++) {
    const q = difficultyQuestions[i % difficultyQuestions.length];
    result.push({
      ...q,
      type: 'quiz',
      exampleLanguage: q.exampleLanguage || 'javascript',
      explanation: q.explanation || ''
    });
  }

  return result;
};

// Simple minimal fallback for when API fails completely
const generateMinimalFallback = (skillName, difficulty) => {
  return generateMockQuestions(skillName, difficulty, 1);
};

// Retry helper function - ONLY for transient network errors, NOT quota errors
const retryWithExponentialBackoff = async (fn, maxRetries = 1, initialDelayMs = 500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // DO NOT retry on quota errors (429) - they won't succeed and waste API calls
      const isQuotaError = error.status === 429 || error.message.includes('429') || error.message.includes('quota');
      if (isQuotaError) {
        throw error; // Fail immediately, don't waste retries
      }
      
      // Only retry on transient network errors
      const isTimeout = error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
      const isNetworkError = error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND');
      
      const isRetryable = isTimeout || isNetworkError;
      
      if (isRetryable && attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️  Attempt ${attempt} failed (${error.message}). Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
    }
  }
};

const extractJsonObject = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch (_error) {
    return null;
  }
};

const inferRoleSkillsFallback = (targetRole = '') => {
  const role = String(targetRole || '').toLowerCase();

  if (role.includes('frontend')) {
    return ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'];
  }
  if (role.includes('backend')) {
    return ['Node.js', 'API Design', 'Databases', 'System Design', 'Testing'];
  }
  if (role.includes('data')) {
    return ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization'];
  }
  if (role.includes('devops')) {
    return ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'Cloud'];
  }

  return ['Problem Solving', 'Communication', 'System Design'];
};

const buildProfileFallback = ({ targetRole = '', userSkills = [], resumeText = '' }) => {
  const normalizedUserSkills = Array.isArray(userSkills)
    ? userSkills
        .map((item) => (item?.name || '').trim())
        .filter(Boolean)
    : [];

  // Expand fallback with common skill ontology and simple resume scanning
  const commonSkills = [
    'JavaScript','TypeScript','React','Angular','Vue','Node.js','Express','HTML','CSS',
    'Python','Django','Flask','Pandas','NumPy','Machine Learning','SQL','PostgreSQL','MongoDB',
    'Docker','Kubernetes','AWS','Azure','GCP','Linux','DevOps','CI/CD','Terraform',
    'Data Science','Deep Learning','TensorFlow','PyTorch','NLP','Computer Vision',
    'System Design','APIs','REST','GraphQL','Testing','Jest','Mocha','Cypress',
    'Git','GitHub','Agile','Scrum','Product Management','UX','UI','Figma'
  ];

  const inferred = inferRoleSkillsFallback(targetRole);
  const requiredSkillNames = Array.from(
    new Set([
      ...normalizedUserSkills,
      ...inferred,
      // include top common skills to increase detection
      ...commonSkills.slice(0, 12)
    ]),
  ).slice(0, 12);

  const resumeLower = String(resumeText || '').toLowerCase();

  // Detect skills directly mentioned in resume text (word-boundary aware)
  const observedSet = new Set();
  for (const skill of requiredSkillNames) {
    const pattern = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(resumeText)) observedSet.add(skill);
    else if (resumeLower.includes(skill.toLowerCase())) observedSet.add(skill);
  }

  // also scan commonSkills for additional signals
  for (const skill of commonSkills) {
    if (observedSet.size >= 10) break;
    const pattern = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(resumeText)) observedSet.add(skill);
  }

  const observedSkills = Array.from(observedSet).slice(0, 10);
  const missingSkills = requiredSkillNames.filter((skill) => !observedSet.has(skill)).slice(0, 6);

  return {
    requiredSkills: requiredSkillNames.map((name, index) => ({
      name,
      priority: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
      reason: 'Fallback inference from target role and provided skills.',
    })),
    resumeInsights: {
      summary: `Role-fit inferred for ${targetRole || 'target role'} with deterministic fallback analysis.`,
      observedSkills,
      missingSkills,
      highlights: [
        observedSkills.length > 0
          ? `Observed skill signals in resume: ${observedSkills.join(', ')}.`
          : 'No direct required-skill signals were found in the resume text.',
        missingSkills.length > 0
          ? `Likely missing skill evidence: ${missingSkills.join(', ')}.`
          : 'Resume already reflects most required skills identified.',
      ],
    },
  };
};

const analyzeProfileWithAI = async ({ currentRole = '', targetRole = '', userSkills = [], resumeText = '' }) => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2500,
    },
  });

  const prompt = [
    'You are a career intelligence engine.',
    'Return only one valid JSON object with the schema below and no extra text.',
    '{',
    '  "requiredSkills": [{"name":"", "priority":"high|medium|low", "reason":""}],',
    '  "resumeInsights": {',
    '    "summary": "",',
    '    "observedSkills": [""],',
    '    "missingSkills": [""],',
    '    "highlights": [""]',
    '  }',
    '}',
    '',
    `Current Role: ${currentRole || 'Not provided'}`,
    `Target Role: ${targetRole || 'Not provided'}`,
    `User-Declared Skills: ${JSON.stringify(userSkills || [])}`,
    `Resume Text: ${String(resumeText || '').slice(0, 6000)}`,
    '',
    'Rules:',
    '- Required skills must represent realistic hiring expectations for the target role.',
    '- Infer missing role-critical skills even if user did not list them.',
    '- observedSkills and missingSkills should be concise and deduplicated.',
    '- highlights must be short recruiter-facing bullets.',
    '- Keep requiredSkills between 5 and 10 items.',
  ].join('\n');

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Profile analysis timeout (>35s)')), 35000)),
  ]);

  const text = result.response.text();
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const requiredSkills = Array.isArray(parsed.requiredSkills)
    ? parsed.requiredSkills
        .map((item) => ({
          name: String(item?.name || '').trim(),
          priority: ['high', 'medium', 'low'].includes(String(item?.priority || '').toLowerCase())
            ? String(item.priority).toLowerCase()
            : 'medium',
          reason: String(item?.reason || '').trim() || 'Derived from role expectations.',
        }))
        .filter((item) => item.name)
        .slice(0, 10)
    : [];

  const resumeInsights = {
    summary: String(parsed?.resumeInsights?.summary || '').trim(),
    observedSkills: Array.isArray(parsed?.resumeInsights?.observedSkills)
      ? parsed.resumeInsights.observedSkills.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 10)
      : [],
    missingSkills: Array.isArray(parsed?.resumeInsights?.missingSkills)
      ? parsed.resumeInsights.missingSkills.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 10)
      : [],
    highlights: Array.isArray(parsed?.resumeInsights?.highlights)
      ? parsed.resumeInsights.highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : [],
  };

  if (requiredSkills.length === 0) {
    return null;
  }

  return {
    requiredSkills,
    resumeInsights,
  };
};

// ML-based question generation using Gemini API with timeout handling
const generateQuestionsWithAI = async (skillName, difficulty, questionCount, context = '') => {
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiKey) {
    console.log('⚠️  GEMINI_API_KEY not configured');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8000
      }
    });

    const difficultyGuide = {
      'beginner': 'fundamental concepts, basic syntax, core principles, simple use cases',
      'intermediate': 'real-world scenarios, implementation patterns, performance considerations, practical problem-solving',
      'advanced': 'complex architectures, optimization techniques, design patterns, edge cases, scalability, system design'
    };

    // Add timestamp and random seed to ensure different questions each time
    const timestamp = Date.now();
    const randomSeed = Math.floor(Math.random() * 1000000);

    const detailedPrompt = `[Session ID: ${timestamp}-${randomSeed}] You are an expert technical assessor creating a NEW, FRESH assessment.

Generate ${questionCount} COMPLETELY NEW AND DIFFERENT multiple-choice questions for "${skillName}" at ${difficulty} difficulty level.

  Candidate Context (use this to personalize questions):
  ${context || 'No additional context provided.'}

CRITICAL REQUIREMENTS:
- DO NOT reuse questions from previous assessments
- Each question MUST be UNIQUE and ORIGINAL
- VARY the topics covered within ${skillName}
- Mix question styles: conceptual, practical coding, debugging, best practices, real-world scenarios
- Focus on: ${difficultyGuide[difficulty]}
- Include WORKING code examples in questions
- Questions should test DIFFERENT aspects of ${skillName}

For EACH question, return this EXACT JSON structure:
{
  "question": "Specific question about ${skillName} (must be different from others)",
  "type": "theory|practical|logical",
  "options": ["Correct option", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
  "correctAnswer": "Correct option (MUST match one of the 4 options exactly)",
  "practicalExample": "Working code snippet demonstrating the concept (use proper ${skillName} syntax)",
  "exampleLanguage": "javascript",
  "explanation": "2-3 sentence explanation of why this is correct for ${skillName}"
}

EXAMPLES OF QUESTION VARIETY FOR ${skillName}:
- Theory: "What is the purpose of X in ${skillName}?"
- Practical: "How would you implement Y using ${skillName}?"
- Debugging: "What's wrong with this ${skillName} code?"
- Performance: "Which approach is more efficient in ${skillName}?"
- Best Practice: "What's the recommended way to do Z in ${skillName}?"

RETURN FORMAT:
- ONLY return a valid JSON array
- NO markdown, NO code blocks, NO explanations
- Start with [ and end with ]
- Generate exactly ${questionCount} questions

Generate NOW with session ${timestamp}:`;

    console.log(`📡 Calling Gemini AI [Session: ${timestamp}-${randomSeed}]`);
    console.log(`   Topic: ${skillName} | Difficulty: ${difficulty} | Count: ${questionCount}`);
    
    // Wrap API call with retry logic and timeout
    let result;
    await retryWithExponentialBackoff(async () => {
      result = await Promise.race([
        model.generateContent(detailedPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini API call timeout (>45s)')), 45000)
        )
      ]);
    }, 3, 1000);
    
    const responseText = result.response.text();
    
    console.log(`📥 Received response (${responseText.length} chars)`);
    
    // Extract JSON array from response - use NON-GREEDY match to avoid capturing too much
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.warn('⚠️  No valid JSON array found in AI response');
      console.warn('Response preview:', responseText.substring(0, 200));
      return null;
    }

    let questionsRaw = [];
    try {
      questionsRaw = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn('⚠️  Failed to parse AI JSON:', parseError.message);
      console.warn('JSON preview:', jsonMatch[0].substring(0, 200));
      return null;
    }

    if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
      console.warn('⚠️  AI returned invalid or empty array');
      return null;
    }

    console.log(`✅ Parsed ${questionsRaw.length} raw questions from AI`);

    // Process and validate questions
    const processedQuestions = questionsRaw
      .filter((q, idx) => {
        if (!q?.question) {
          console.warn(`⚠️  Question ${idx + 1} missing 'question' field`);
          return false;
        }
        if (!Array.isArray(q?.options) || q.options.length < 2) {
          console.warn(`⚠️  Question ${idx + 1} invalid options (need at least 2 options, got ${q?.options?.length || 0})`);
          return false;
        }
        if (!q?.correctAnswer) {
          console.warn(`⚠️  Question ${idx + 1} missing 'correctAnswer' field`);
          return false;
        }
        return true;
      })
      .map((q, idx) => {
        // Ensure we have at least 4 options, pad if necessary
        let options = [...(Array.isArray(q.options) ? q.options : [])];
        const correctAnswer = String(q.correctAnswer || '').trim();
        
        // If less than 4 options, pad with generic wrong answers
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        
        // Take only first 4 options if more than 4
        options = options.slice(0, 4);
        
        // Shuffle options
        const shuffledOptions = shuffleArray([...options]);
        
        // Find correct answer in shuffled options (case-insensitive match)
        // IMPORTANT: First try exact match (case-insensitive), then try containing match
        let finalCorrectAnswer = shuffledOptions.find(opt => 
          String(opt || '').trim().toLowerCase() === correctAnswer.toLowerCase()
        );
        
        // If exact match not found, try to find any option containing the original correct answer
        if (!finalCorrectAnswer) {
          finalCorrectAnswer = shuffledOptions.find(opt =>
            String(opt || '').trim().toLowerCase().includes(correctAnswer.slice(0, 20).toLowerCase())
          );
        }
        
        // Last resort: use the first valid option from shuffled array
        if (!finalCorrectAnswer) {
          console.warn(`⚠️  Question ${idx + 1} correct answer not found in options. Using first option as fallback.`);
          finalCorrectAnswer = shuffledOptions[0] || correctAnswer;
        }

        return {
          question: String(q.question || '').trim(),
          type: q.type || 'theory',
          options: shuffledOptions.map(opt => String(opt || '').trim()),
          correctAnswer: String(finalCorrectAnswer || '').trim(),
          practicalExample: q.practicalExample || `// ${skillName} example\nconsole.log('Example for ${skillName}');`,
          exampleLanguage: q.exampleLanguage || 'javascript',
          explanation: q.explanation || `This is important for understanding ${skillName}.`
        };
      })
      .slice(0, questionCount);

    console.log(`✅ Successfully processed ${processedQuestions.length} valid questions\n`);
    return processedQuestions.length > 0 ? processedQuestions : null;
  } catch (error) {
    console.error('❌ AI generation error:', error.message);
    console.error('❌ Error details:', error.toString());
    console.error('❌ Error type:', error.constructor.name);
    if (error.stack) console.error('Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    return null;
  }
};

// Save/Create a skill evaluation
router.post(
  '/',
  authenticate,
  requireMongo,
  body('skillName').optional().isString().trim().isLength({ max: 200 }).withMessage('skillName must be a string <=200 chars'),
  body('title').optional().isString().trim().isLength({ max: 200 }).withMessage('title must be <=200 chars'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
  body('questions').optional().isArray().withMessage('questions must be an array'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const {
      user,
      userId,
      userEmail,
      skillName,
      title,
      difficulty,
      questions,
      score,
      percentage,
      feedback,
      status,
      completedAt,
    } = withAuthenticatedUser(req, req.body);

    if (!skillName && !title) {
      return res.status(400).json({ error: 'Skill name or title is required' });
    }

    const userObjectId = req.user.id;

    const evaluation = await SkillEvaluation.create({
      user: userObjectId,
      userId: userId || userObjectId.toString(),
      userEmail: userEmail || req.user.email,
      skillName: skillName || title || '',
      title: title || skillName || '',
      difficulty: difficulty || 'intermediate',
      questions: questions || [],
      totalQuestions: questions ? questions.length : 0,
      score: score || 0,
      percentage: percentage || 0,
      feedback: feedback || '',
      status: status || 'completed',
      completedAt: completedAt || (status === 'completed' ? new Date() : null)
    });

    res.status(201).json({ success: true, evaluationId: evaluation._id, data: evaluation });
  } catch (error) {
    console.error('Evaluation creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic endpoint to check environment configuration
router.get('/config-check', (req, res) => {
  res.json({
    geminiApiKeyConfigured: !!process.env.GEMINI_API_KEY,
    geminiApiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    mongodbConfigured: !!process.env.MONGODB_URI,
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
});

router.post(
  '/analyze-profile',
  authenticate,
  body('currentRole').optional().isString().trim().isLength({ max: 200 }),
  body('targetRole').optional().isString().trim().isLength({ max: 200 }),
  body('userSkills').optional().isArray(),
  body('resumeText').optional().isString().isLength({ max: 60000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { currentRole, targetRole, userSkills, resumeText } = req.body || {};

    const fallback = buildProfileFallback({
      targetRole,
      userSkills,
      resumeText,
    });

    let aiResult = null;
    try {
      aiResult = await analyzeProfileWithAI({
        currentRole,
        targetRole,
        userSkills,
        resumeText,
      });
    } catch (error) {
      console.warn('Profile analysis AI failed, using fallback:', error.message);
    }

    const payload = aiResult || fallback;

    return res.json({
      requiredSkills: payload.requiredSkills,
      resumeInsights: {
        summary: payload.resumeInsights?.summary || fallback.resumeInsights.summary,
        observedSkills: payload.resumeInsights?.observedSkills || fallback.resumeInsights.observedSkills,
        missingSkills: payload.resumeInsights?.missingSkills || fallback.resumeInsights.missingSkills,
        highlights: payload.resumeInsights?.highlights || fallback.resumeInsights.highlights,
      },
      meta: {
        source: aiResult ? 'gemini' : 'fallback',
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Profile analysis endpoint error:', error);
    return res.status(500).json({
      error: 'Failed to analyze profile',
      message: error.message,
    });
  }
});

// Generate skill evaluation questions and persist
router.post(
  '/evaluate',
  optionalAuth,
  body('skillName').isString().trim().isLength({ min: 1, max: 200 }).withMessage('skillName is required'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
  body('questionCount').optional().isInt({ min: 1, max: 200 }).withMessage('questionCount must be an integer between 1 and 200'),
  body('context').optional().isString().isLength({ max: 20000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { skillName, difficulty, questionCount, userId, userEmail, context } = withAuthenticatedUser(req, req.body);

  try {
    const qCount = questionCount || 20;
    const diff = difficulty || 'intermediate';
    let questions = [];

    console.log(`\n📝 ========== Question Generation Request ==========`);
    console.log(`   Topic: ${skillName}`);
    console.log(`   Difficulty: ${diff}`);
    console.log(`   Questions: ${qCount}`);
    console.log(`   GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`   Using: Live Gemini AI Only (No Mock Data)\n`);

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error(`❌ ERROR: GEMINI_API_KEY not configured`);
      console.error(`   Please set GEMINI_API_KEY in your .env file\n`);
      
      return res.status(500).json({ 
        error: 'Configuration Error',
        message: 'GEMINI_API_KEY environment variable is not configured. Please set it in your .env file.',
        details: {
          requiredVar: 'GEMINI_API_KEY',
          configured: false,
          fix: 'Add GEMINI_API_KEY=your-key-here to .env file'
        }
      });
    }

    // Try AI first, fall back to mock data if API fails
    console.log(`🤖 Attempting Gemini AI to generate ${qCount} questions for "${skillName}"...`);
    const aiQuestions = await generateQuestionsWithAI(skillName, diff, qCount, context || '');
    let questionSource = 'Unknown';
    
    if (!aiQuestions || aiQuestions.length === 0) {
      console.warn('⚠️  Gemini AI failed, falling back to mock questions...');
      const mockQuestions = generateMockQuestions(skillName, diff, qCount);
      if (!mockQuestions || mockQuestions.length === 0) {
        console.error('❌ Both AI and mock data failed');
        return res.status(500).json({
          error: 'Question Generation Failed',
          message: 'Unable to generate questions. Please try again.',
          suggestion: 'Check your API key quota or try a different skill'
        });
      }
      console.log(`✅ Using mock questions as fallback\n`);
      questions = mockQuestions;
      questionSource = 'Mock Data (API Fallback)';
    } else {
      console.log(`✅ Gemini AI generated ${aiQuestions.length} questions\n`);
      questions = aiQuestions;
      questionSource = 'Gemini AI (Live)';
    }

    // Ensure we have at least some questions
    if (!questions || questions.length === 0) {
      console.error('❌ CRITICAL ERROR: No questions available');
      return res.status(500).json({
        error: 'Question Generation Failed',
        message: 'Unable to generate questions. API quota may be exhausted.',
        suggestion: 'Enable billing on your Google Cloud account'
      });
    }

    const userObjectId =
      req.user?.id ||
      (userId && userId !== 'guest' && mongoose.Types.ObjectId.isValid(userId) ? userId : null);

    // Save evaluation to database
    const evalDoc = await SkillEvaluation.create({
      user: userObjectId,
      userId: userId || (userObjectId ? userObjectId.toString() : 'guest'),
      userEmail: userEmail || req.user?.email || null,
      skillName,
      title: `${skillName} Assessment (${diff})`,
      difficulty: diff,
      questions,
      totalQuestions: questions.length,
      status: 'in-progress',
      metadata: {
        generatedFrom: questionSource,
        generatedAt: new Date(),
        generationMethod: questionSource.includes('Gemini') ? 'Live AI' : 'Mock Data Fallback'
      }
    });

    console.log(`✅ Evaluation created successfully`);
    console.log(`   Evaluation ID: ${evalDoc._id}`);
    console.log(`   Total Questions: ${questions.length}`);
    console.log(`   Source: ${questionSource}\n`);

    res.json({ 
      evaluationId: evalDoc._id,
      skillName,
      difficulty: diff,
      questions,
      totalQuestions: questions.length,
      source: questionSource,
      evaluatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ ========== EVALUATION REQUEST FAILED ==========');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error details:', error.toString());
    if (error.stack) console.error('❌ Stack:\n', error.stack);
    console.error('❌ =============================================\n');
    
    // Return detailed error to help with debugging
    res.status(500).json({ 
      error: 'Failed to generate evaluation',
      message: error.message,
      type: error.constructor.name,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      geminiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
      suggestion: error.message.includes('timeout') ? 'Gemini API is slow. Try with fewer questions or wait a moment.' 
                  : error.message.includes('rate') ? 'Rate limited. Wait a moment before trying again.'
                  : 'Check your API key and ensure it has available quota',
      timestamp: new Date().toISOString()
    });
  }
});

// Submit evaluation answers and score
router.post(
  '/submit',
  authenticate,
  requireMongo,
  body('evaluationId').isString().trim().withMessage('evaluationId is required'),
  body('answers').custom((v) => typeof v === 'object' && v !== null).withMessage('answers must be an object or array'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { evaluationId, answers } = req.body;

  try {
    const evalDoc = await SkillEvaluation.findOne({
      _id: evaluationId,
      user: req.user.id,
    });
    if (!evalDoc) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    let correct = 0;
    const updatedQuestions = evalDoc.questions.map((q, idx) => {
      const userAnswer = answers[idx] || answers[q.question];
      const isCorrect = userAnswer && userAnswer === q.correctAnswer;
      if (isCorrect) correct += 1;
      return { ...q.toObject(), userAnswer, isCorrect };
    });

    const totalQuestions = updatedQuestions.length || 1;
    const score = (correct / totalQuestions) * 100;
    const percentage = Math.round(score);

    evalDoc.questions = updatedQuestions;
    evalDoc.score = score;
    evalDoc.percentage = percentage;
    evalDoc.correctAnswers = correct;
    evalDoc.status = 'completed';
    evalDoc.completedAt = new Date();
    await evalDoc.save();

    res.json({
      evaluationId,
      score,
      percentage,
      correct,
      total: totalQuestions,
      status: 'completed'
    });
  } catch (error) {
    console.error('Evaluation submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List evaluations for authenticated user
router.get('/', authenticate, requireMongo, async (req, res) => {
  try {
    const filter = ownerFilter(req.user);
    const evaluations = await SkillEvaluation.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, evaluations, count: evaluations.length });
  } catch (error) {
    console.error('Evaluations fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single evaluation by ID
router.get('/:id', optionalAuth, requireMongo, async (req, res) => {
  try {
    const evaluation = await SkillEvaluation.findById(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    if (evaluation.user && (!req.user || !documentOwnedByUser(evaluation, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('Evaluation fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
