class InputParser:
    def __init__(self, file):
        self.file=file

    def text_parser(self):
        items = []
        with open(self.file, "r") as file:
            for line in file:
                items.append(line.strip().lower())

        return items